import { IAnalyticsRepository } from "../repositories/analytics.repo";
import { IEventRepository } from "../repositories/event.repo";
import { redis } from "../config/redis";
import logger from "../config/logger";
import { NotFoundError } from "../errors/http-errors";
import pLimit from "p-limit";

export class AnalyticsService {

    constructor(
        private analyticsRepo: IAnalyticsRepository,
        private eventRepo: IEventRepository,
    ) { }
    /** 
     * Background job/corn
     * reads Redis counters & persists them to DB
     * should run every X minutes
    */
    async snapshotEvent(eventId: string): Promise<void> {

        const visitsKey = `analytics:event:${eventId}:visits:delta`;
        const startedKey = `analytics:event:${eventId}:started:delta`;
        const submittedKey = `analytics:event:${eventId}:submitted:delta`;

        const [visits, started, submitted] = await redis.mget(
            visitsKey,
            startedKey,
            submittedKey
        );

        const visitsDelta = Number(visits || 0);
        const startedDelta = Number(started || 0);
        const submittedDelta = Number(submitted || 0);

        if (!visitsDelta && !startedDelta && !submittedDelta) {
            return;
        }

        try {
            await this.analyticsRepo.incrementEventTotals({
                eventId,
                visitsDelta,
                startedDelta,
                submittedDelta,
            });

            await redis.del(visitsKey, startedKey, submittedKey);

        } catch (err) {
            logger.error("Snapshot failed", { eventId, error:  (err as Error).message });
            throw err;
        }

    }
    // snapshot all active events
    async snapshotAllEvents(): Promise<void> {
        const events = await this.eventRepo.findActiveEvents();

        const limit = pLimit(5);
        await Promise.allSettled(
            events.map(e => limit(() => this.snapshotEvent(e.id)))
        )
    }

    // Admin: get analytics for one event
    async getEventAnalytics(eventId: string) {
        // check if event exist
        const event = await this.eventRepo.findById(eventId);
        if (!event) throw new NotFoundError("event not found");

        const dbAnalytics = await this.analyticsRepo.getEventAnalytics(eventId);

        const visitsKey = `analytics:event:${eventId}:visits:delta`;
        const startedKey = `analytics:event:${eventId}:started:delta`;
        const submittedKey = `analytics:event:${eventId}:submitted:delta`;

        const [visitsDelta, startedDelta, submittedDelta] = await redis.mget(visitsKey, startedKey, submittedKey);

        const visits = (dbAnalytics?.totalVisits || 0) + Number(visitsDelta || 0);
        const started = (dbAnalytics?.totalStarted || 0) + Number(startedDelta || 0);
        const submitted = (dbAnalytics?.totalSubmitted || 0) + Number(submittedDelta || 0);

        const conversionRate = started === 0 ? 0 : Number(((submitted / started) * 100).toFixed(2));

        return {
            eventId,
            totalVisits: visits,
            totalStarted: started,
            totalSubmitted: submitted,
            conversionRate,
            lastUpdated: dbAnalytics?.lastUpdated ?? null,
        }

    }

    // Admin: dashboard global stats
    async getGlobalStats() {
        return this.analyticsRepo.getGlobalStats();
    }

    async getEventAnalyticsRange(eventId: string, days: number) {
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - days);

        const rows = await this.analyticsRepo.getDailyAnalytics(eventId, fromDate);

        // Build a lookup from date string → row
        const rowMap = new Map<string, { visits: number; started: number; submitted: number }>();
        for (const r of rows) {
            const key = r.date.toISOString().slice(0, 10); // "YYYY-MM-DD"
            rowMap.set(key, {
                visits: r.visits,
                started: r.started,
                submitted: r.submitted,
            });
        }

        // Fill in zeros for every day in the range
        const timeline: { date: string; visits: number; started: number; submitted: number }[] = [];
        const cursor = new Date(fromDate);
        cursor.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        while (cursor <= today) {
            const key = cursor.toISOString().slice(0, 10);
            const existing = rowMap.get(key);
            timeline.push({
                date: key,
                visits: existing?.visits ?? 0,
                started: existing?.started ?? 0,
                submitted: existing?.submitted ?? 0,
            });
            cursor.setDate(cursor.getDate() + 1);
        }

        const totals = timeline.reduce(
            (acc, r) => {
                acc.visits += r.visits;
                acc.started += r.started;
                acc.submitted += r.submitted;
                return acc;
            },
            { visits: 0, started: 0, submitted: 0 }
        );

        return {
            ...totals,
            conversionRate: totals.started === 0
                ? 0
                : (totals.submitted / totals.started) * 100,
            timeline,
        };
    }


}
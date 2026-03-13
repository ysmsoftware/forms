import { prisma } from "../config/db";
import logger from "../config/logger";
import { redis } from "../config/redis";
import { AnalyticsRepository } from "../repositories/analytics.repo";
import cron from "node-cron";
import { workerRegistry } from "./worker.registry";


export class DailyAnalyticsWorker {

    name = "daily-analytics-worker";
    constructor(private analyticsRepo: AnalyticsRepository) {}

    /**
     *  runs every day at 00:00
     *  saves previous day's snapshot
     */   
    async runDailySnapshot() {
        const lock = await redis.set("analytics:daily:lock", "1", "EX", 60*10, "NX");

        if(!lock) {
            logger.info("Daily analytics skipped (lock exists)");
            return;
        }

        logger.info("Daily analytics snapshot started");

        try {
            const now = new Date();
            const today = new Date(
                Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
            );

            const yesterday = new Date(today);
            yesterday.setUTCDate(today.getUTCDate() - 1 );

            // all event
            const eventAnalytics = await prisma.eventAnalytics.findMany({
                where: {
                    lastUpdated: { gte: yesterday, lt: today },
                }
            });

            for(const analytics of eventAnalytics) {
                try {
                    // previous day
                    const prevDaily = await prisma.eventAnalyticsDaily.findFirst({
                        where: {
                            eventId: analytics.eventId,
                            date: { lt: yesterday },
                        },
                        orderBy: { date: "desc" },
                    });

                    const prevVisits = prevDaily?.visits ?? 0;
                    const prevStarted = prevDaily?.started ?? 0;
                    const prevSubmiited = prevDaily?.submitted ?? 0;


                    const dailyVisits = analytics.totalVisits - prevVisits;
                    const dailyStarted = analytics.totalStarted - prevStarted;
                    const dailySubmitted = analytics.totalSubmitted - prevSubmiited;


                    const conversionRate = dailyStarted === 0
                            ? 0
                            : Number(
                                ((dailySubmitted / dailyStarted) * 100).toFixed(2)
                            );
                    
                    
                    await prisma.eventAnalyticsDaily.upsert({
                        where: {
                            eventId_date: {
                                eventId: analytics.eventId,
                                date: yesterday,
                            },
                        },
                        update: {
                            visits: Math.max(0, dailyVisits),
                            started: Math.max(0, dailyStarted),
                            submitted: Math.max(0, dailySubmitted),
                            conversionRate,
                        },
                        create: {
                            eventId: analytics.eventId,
                            date: yesterday,
                            visits: Math.max(0, dailyVisits),
                            started: Math.max(0, dailyStarted),
                            submitted: Math.max(0, dailySubmitted),
                            conversionRate,
                        },
                    });

                } catch(err) {
                    logger.error("Daily analytics failed for event", {
                        eventId: analytics.eventId,
                        err,
                    });
                }
            }

            logger.info("Daily analytics snapshot completed");

        } catch(err) {
            logger.error("Daily analytics worker failed", err);
        } finally {
            await redis.del("analytics:daily:lock");
        }
    }

    start() {
        // every day at 00:00
        cron.schedule("0 0 * * *", async () => {
            await this.runDailySnapshot();
        });

        logger.info("Daily analytics worker scheduled (00:00)");
    }

}


workerRegistry.register(
    new DailyAnalyticsWorker(new AnalyticsRepository())
);
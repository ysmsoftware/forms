import { EventAnalytics, EventAnalyticsDaily } from "@prisma/client";
import { prisma } from "../config/db";

export interface IAnalyticsRepository {

    incrementEventTotals(data: {
        organizationId: string;
        eventId: string;
        visitsDelta: number;
        startedDelta: number;
        submittedDelta: number;
    }): Promise<EventAnalytics>;

    getEventAnalytics(organizationId: string, eventId: string): Promise<EventAnalytics | null>;

    getGlobalStats(organizationId: string): Promise<{
        totalEvents: number;
        totalSubmissions: number;
        totalRevenue: number;
    }>;

    getDailyAnalytics(organizationId: string, eventId: string, fromDate: Date): Promise<EventAnalyticsDaily[]>;
}

export class AnalyticsRepository implements IAnalyticsRepository {

    async incrementEventTotals(data: {
        organizationId: string;
        eventId: string;
        visitsDelta: number;
        startedDelta: number;
        submittedDelta: number;
    }): Promise<EventAnalytics> {

        const deltaConversionRate = this.computeRate(data.startedDelta, data.submittedDelta);

        return  prisma.eventAnalytics.upsert({
            where: { eventId: data.eventId },
                create: {
                    organizationId: data.organizationId,
                    eventId: data.eventId,
                    totalVisits: data.visitsDelta,
                    totalStarted: data.startedDelta,
                    totalSubmitted: data.submittedDelta,
                    conversionRate: this.computeRate(data.startedDelta, data.submittedDelta),
                    lastUpdated: new Date(),
                },
                update: {
                    totalVisits: { increment: data.visitsDelta },
                    totalStarted: { increment: data.startedDelta },
                    totalSubmitted: { increment: data.submittedDelta },
                    conversionRate: deltaConversionRate,
                    lastUpdated: new Date(),
                },
        })
    }

    async getEventAnalytics(organizationId: string, eventId: string,): Promise<EventAnalytics | null> {
        return prisma.eventAnalytics.findUnique({
            where: {  organizationId, eventId },
        });
    }

    async getGlobalStats(organizationId: string) {
        const [eventCount, submissionCount, revenue] = await Promise.all([
            prisma.event.count({ where: { organizationId } }),
            prisma.formSubmission.count({ where: { organizationId } }),
            prisma.payment.aggregate({
                where: { status: "SUCCESS", organizationId },
                _sum: { amount: true },
            }),
        ]);

        return {
            totalEvents: eventCount,
            totalSubmissions: submissionCount,
            totalRevenue: revenue._sum.amount || 0,
        };
    }

    async getDailyAnalytics(organizationId: string, eventId: string, fromDate: Date): Promise<EventAnalyticsDaily[]> {
        return prisma.eventAnalyticsDaily.findMany({
            where: {
                organizationId,
                eventId,
                date: { gte: fromDate },
            },
            orderBy: { date: "asc" },
        });
    }

    private computeRate(started: number, submitted: number) {
        if (started === 0) return 0;
        return Number(((submitted / started) * 100).toFixed(2));
    }
}

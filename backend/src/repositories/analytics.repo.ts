import { EventAnalytics, EventAnalyticsDaily } from "@prisma/client";
import { prisma } from "../config/db";

export interface IAnalyticsRepository {

    incrementEventTotals(data: {
        eventId: string;
        visitsDelta: number;
        startedDelta: number;
        submittedDelta: number;
    }): Promise<EventAnalytics>;

    getEventAnalytics(eventId: string): Promise<EventAnalytics | null>;

    getGlobalStats(): Promise<{
        totalEvents: number;
        totalSubmissions: number;
        totalRevenue: number;
    }>;

    getDailyAnalytics(eventId: string, fromDate: Date): Promise<EventAnalyticsDaily[]>;
}

export class AnalyticsRepository implements IAnalyticsRepository {

    async incrementEventTotals(data: {
        eventId: string;
        visitsDelta: number;
        startedDelta: number;
        submittedDelta: number;
    }): Promise<EventAnalytics> {

        return prisma.$transaction(async (tx) => {

            const current = await tx.eventAnalytics.findUnique({
                where: { eventId: data.eventId },
                select: { totalStarted: true, totalSubmitted: true },
            });

            const newTotalStarted = (current?.totalStarted || 0) + data.startedDelta;
            const newTotalSubmitted = (current?.totalSubmitted || 0) + data.submittedDelta;
            const newConversionRate = this.computeRate(newTotalStarted, newTotalSubmitted);

            return tx.eventAnalytics.upsert({
                where: { eventId: data.eventId },
                create: {
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
                    conversionRate: newConversionRate,
                    lastUpdated: new Date(),
                },
            });


        })
    }

    async getEventAnalytics(eventId: string): Promise<EventAnalytics | null> {
        return prisma.eventAnalytics.findUnique({
            where: { eventId },
        });
    }

    async getGlobalStats() {
        const [eventCount, submissionCount, revenue] = await Promise.all([
            prisma.event.count(),
            prisma.formSubmission.count(),
            prisma.payment.aggregate({
                where: { status: "SUCCESS" },
                _sum: { amount: true },
            }),
        ]);

        return {
            totalEvents: eventCount,
            totalSubmissions: submissionCount,
            totalRevenue: revenue._sum.amount || 0,
        };
    }

    async getDailyAnalytics(eventId: string, fromDate: Date): Promise<EventAnalyticsDaily[]> {
        return prisma.eventAnalyticsDaily.findMany({
            where: {
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

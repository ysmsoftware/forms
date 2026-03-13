import { apiClient } from "./client";
import type { GlobalAnalytics, DailyAnalyticsPoint, EventAnalyticsDetail } from "../types/api";

export async function getGlobalStats(): Promise<GlobalAnalytics> {
    return apiClient<GlobalAnalytics>(`/analytics/global`);
}

export async function getEventAnalytics(eventId: string): Promise<EventAnalyticsDetail> {
    return apiClient<EventAnalyticsDetail>(`/analytics/events/${eventId}`);
}

export async function getDailyAnalytics(
    eventId: string,
    days: number = 30
): Promise<DailyAnalyticsPoint[]> {
    return apiClient<DailyAnalyticsPoint[]>(`/analytics/events/${eventId}/daily?days=${days}`);
}

export async function getGlobalDailyAnalytics(
    eventIds: string[],
    days: number = 30
): Promise<DailyAnalyticsPoint[]> {
    if (eventIds.length === 0) return [];

    const results = await Promise.allSettled(
        eventIds.map(id => getDailyAnalytics(id, days))
    );

    const aggregated = new Map<string, DailyAnalyticsPoint>();
    for (const result of results) {
        if (result.status !== "fulfilled") continue;
        for (const point of result.value) {
            const existing = aggregated.get(point.date);
            if (existing) {
                existing.visits += point.visits;
                existing.started += point.started;
                existing.submitted += point.submitted;
            } else {
                aggregated.set(point.date, { ...point });
            }
        }
    }

    return Array.from(aggregated.values()).sort((a, b) =>
        a.date.localeCompare(b.date)
    );
}

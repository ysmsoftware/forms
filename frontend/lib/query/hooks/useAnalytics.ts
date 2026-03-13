import { useQuery } from "@tanstack/react-query"
import { useQueries } from "@tanstack/react-query"
import { getGlobalStats, getEventAnalytics, getDailyAnalytics } from "@/lib/api/analytics"
import { queryKeys } from "../keys"
import type { Event } from "@/lib/types/api"

export function useGlobalStats() {
    return useQuery({
        queryKey: queryKeys.analytics.global(),
        queryFn: getGlobalStats,
    })
}

export function useEventAnalytics(eventId: string) {
    return useQuery({
        queryKey: queryKeys.analytics.byEvent(eventId),
        queryFn: () => getEventAnalytics(eventId),
        enabled: !!eventId,
    })
}

export function useDailyAnalytics(eventId: string, days: number) {
    return useQuery({
        queryKey: queryKeys.analytics.daily(eventId, days),
        queryFn: () => getDailyAnalytics(eventId, days),
        enabled: !!eventId,
    })
}

// Batch fetch analytics for every event — replaces the Promise.allSettled pattern
export function useAllEventAnalytics(events: Event[]) {
    return useQueries({
        queries: events.map((e) => ({
            queryKey: queryKeys.analytics.byEvent(e.id),
            queryFn: () => getEventAnalytics(e.id),
            enabled: events.length > 0,
        })),
    })
}
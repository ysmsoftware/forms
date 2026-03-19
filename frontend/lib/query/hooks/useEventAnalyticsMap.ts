import { useAllEventAnalytics } from "./useAnalytics"
import type { Event } from "@/lib/types/api"

export interface EventAnalyticsMap {
    [eventId: string]: {
        totalVisits: number
        totalStarted: number
        totalSubmitted: number
        conversionRate: number
    } | undefined
}

export function useEventAnalyticsMap(events: Event[]): {
    analyticsMap: EventAnalyticsMap
    isLoading: boolean
    totalVisits: number
    totalSubmissions: number
} {
    const results = useAllEventAnalytics(events)

    const analyticsMap: EventAnalyticsMap = Object.fromEntries(
        events.map((e, i) => [e.id, results[i]?.data])
    )

    const isLoading = results.some(r => r.isLoading)

    const totalVisits = results.reduce((s, r) => s + (r.data?.totalVisits ?? 0), 0)
    const totalSubmissions = results.reduce((s, r) => s + (r.data?.totalSubmitted ?? 0), 0)

    return { analyticsMap, isLoading, totalVisits, totalSubmissions }
}

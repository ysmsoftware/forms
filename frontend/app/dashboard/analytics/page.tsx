"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
} from "recharts"
import { TrendingUp, Users, FileText, DollarSign, MousePointer, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { getEvents } from "@/lib/api/events"
import {
    getGlobalStats,
    getEventAnalytics,
    getDailyAnalytics,
    getGlobalDailyAnalytics,
} from "@/lib/api/analytics"
import type { Event, GlobalAnalytics, EventAnalyticsDetail, DailyAnalyticsPoint } from "@/lib/types/api"

const DAY_PRESETS = [
    { label: "7 days", value: 7 },
    { label: "30 days", value: 30 },
    { label: "90 days", value: 90 },
]

export default function Analytics() {
    const [events, setEvents] = useState<Event[]>([])
    const [selectedEvent, setSelectedEvent] = useState("all")
    const [selectedDays, setSelectedDays] = useState(30)
    const [isLoading, setIsLoading] = useState(true)
    const [isChartLoading, setIsChartLoading] = useState(false)

    // Global stats (only used when selectedEvent === "all")
    const [globalStats, setGlobalStats] = useState<GlobalAnalytics | null>(null)

    // Per-event stats (used when a specific event is selected)
    const [eventStats, setEventStats] = useState<EventAnalyticsDetail | null>(null)

    // Timeline data for the line chart
    const [timeline, setTimeline] = useState<DailyAnalyticsPoint[]>([])

    // Per-event submission counts for the top-events bar chart
    const [eventSubmissions, setEventSubmissions] = useState<{ name: string; submissions: number }[]>([])

    // ── Load events list once on mount ────────────────────────────
    useEffect(() => {
        getEvents()
            .then(setEvents)
            .catch((err) => toast.error("Failed to load events: " + err.message))
    }, [])

    // ── Load global stats once on mount ───────────────────────────
    useEffect(() => {
        getGlobalStats()
            .then(setGlobalStats)
            .catch(() => { /* silently ignore — cards stay at 0 */ })
    }, [])

    // ── Main data loader: re-runs when event or day range changes ─
    const loadData = useCallback(async () => {
        if (events.length === 0) return
        setIsLoading(true)

        try {
            if (selectedEvent === "all") {
                // Fetch all event analytics for top-events bar chart
                const allEventAnalytics = await Promise.allSettled(
                    events.map(e => getEventAnalytics(e.id))
                )
                const topData = events.map((e, i) => {
                    const result = allEventAnalytics[i]
                    return {
                        name: e.title,
                        submissions: result.status === "fulfilled" ? result.value.totalSubmitted : 0,
                    }
                }).sort((a, b) => b.submissions - a.submissions).slice(0, 5)
                setEventSubmissions(topData)
                setEventStats(null)

                // Aggregate daily chart across all events
                setIsChartLoading(true)
                const allIds = events.map(e => e.id)
                const aggregated = await getGlobalDailyAnalytics(allIds, selectedDays)
                setTimeline(aggregated)
                setIsChartLoading(false)

            } else {
                // Single event selected
                const [stats, daily] = await Promise.all([
                    getEventAnalytics(selectedEvent),
                    getDailyAnalytics(selectedEvent, selectedDays),
                ])
                setEventStats(stats)
                setTimeline(daily)
                setEventSubmissions([])
            }
        } catch (err: any) {
            toast.error("Failed to load analytics: " + err.message)
        } finally {
            setIsLoading(false)
        }
    }, [events, selectedEvent, selectedDays])

    useEffect(() => {
        if (events.length > 0) {
            loadData()
        }
    }, [loadData, events.length])

    // ── Computed display values ────────────────────────────────────
    // When "all" is selected: use global stats + aggregate from all event analytics
    // When a specific event: use eventStats
    const displayVisits = selectedEvent === "all"
        ? (globalStats ? undefined : 0) // shown from globalStats via a different field
        : eventStats?.totalVisits ?? 0

    const displayStarted = eventStats?.totalStarted ?? 0
    const displaySubmitted = selectedEvent === "all"
        ? globalStats?.totalSubmissions ?? 0
        : eventStats?.totalSubmitted ?? 0
    const displayRevenue = globalStats?.totalRevenue ?? 0
    const totalEvents = globalStats?.totalEvents ?? events.length

    const conversionRate = eventStats
        ? eventStats.conversionRate.toFixed(1)
        : "—"

    // For funnel (only meaningful per-event)
    const conversionFunnel = eventStats ? [
        { name: "Visited", value: eventStats.totalVisits, color: "#8884d8" },
        { name: "Started", value: eventStats.totalStarted, color: "#82ca9d" },
        { name: "Submitted", value: eventStats.totalSubmitted, color: "#ffc658" },
    ] : []

    // Progress bar widths — capped at 100
    const visitToStartRate = eventStats && eventStats.totalVisits > 0
        ? Math.min(100, (eventStats.totalStarted / eventStats.totalVisits) * 100)
        : 0
    const startToSubmitRate = eventStats && eventStats.totalStarted > 0
        ? Math.min(100, (eventStats.totalSubmitted / eventStats.totalStarted) * 100)
        : 0
    const overallRate = eventStats && eventStats.totalVisits > 0
        ? Math.min(100, (eventStats.totalSubmitted / eventStats.totalVisits) * 100)
        : 0

    const statCards = [
        {
            title: "Total Events",
            value: isLoading ? "—" : String(totalEvents),
            icon: FileText,
            color: "text-blue-600",
        },
        {
            title: "Total Submissions",
            value: isLoading ? "—" : String(displaySubmitted),
            icon: TrendingUp,
            color: "text-purple-600",
        },
        {
            title: "Total Revenue",
            value: isLoading ? "—" : `₹${displayRevenue.toLocaleString()}`,
            icon: DollarSign,
            color: "text-emerald-600",
        },
        ...(selectedEvent !== "all" && eventStats ? [
            {
                title: "Total Visitors",
                value: String(eventStats.totalVisits),
                icon: Users,
                color: "text-green-600",
            },
            {
                title: "Total Started",
                value: String(eventStats.totalStarted),
                icon: MousePointer,
                color: "text-yellow-600",
            },
        ] : []),
    ]

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
                    <p className="text-muted-foreground">Comprehensive analytics across all your events and forms.</p>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-6 xl:items-center">
                {/* KPI Cards */}
                <Card className="flex-1 min-w-0">
                    <CardContent className="py-0 px-1 overflow-x-auto hidden-scrollbar">
                        <div className="flex items-center gap-6 w-full py-1.5">
                            {isLoading
                                ? Array.from({ length: 5 }).map((_, i) => (
                                    <div key={`skel-${i}`} className="flex flex-shrink-0 items-center gap-6">
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="h-7 w-7 rounded-full" />
                                            <div className="flex flex-col gap-1.5">
                                                <Skeleton className="h-6 w-12" />
                                                <Skeleton className="h-3 w-20" />
                                            </div>
                                        </div>
                                        {i < 4 && <div className="w-px h-8 bg-border" />}
                                    </div>
                                ))
                                : statCards.map((stat, i) => (
                                    <div key={stat.title} className="flex flex-shrink-0 items-center gap-6">
                                        <div className="flex items-center gap-2">
                                            <div className={`p-2.5 rounded-full ${stat.color}`}>
                                                <stat.icon className="h-5 w-5" />
                                            </div>
                                            <div className="flex flex-row items-center gap-1">
                                                <span className="text-xl font-bold leading-none">{stat.value}</span>
                                                <span className="text-sm text-muted-foreground mt-1 whitespace-nowrap">{stat.title}</span>
                                            </div>
                                        </div>
                                        {i < statCards.length - 1 && <div className="w-px h-8 bg-border" />}
                                    </div>
                                ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 flex-shrink-0">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                        {/* Event selector */}
                        <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                            <SelectTrigger className="w-full sm:w-[260px]">
                                <SelectValue placeholder="Filter by event" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Events</SelectItem>
                                {events.map((e) => (
                                    <SelectItem key={e.id} value={e.id}>
                                        {e.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Day range quick-select */}
                        <div className="flex gap-2">
                            {DAY_PRESETS.map((preset) => (
                                <Button
                                    key={preset.value}
                                    variant={selectedDays === preset.value ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setSelectedDays(preset.value)}
                                >
                                    {preset.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>

                <div>
                    <Button variant="outline" onClick={loadData} disabled={isLoading}>
                        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />

                    </Button>
                </div>

            </div>


            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Submissions Over Time */}
                <Card>
                    <CardHeader>
                        <CardTitle>Submissions Over Time</CardTitle>
                        <CardDescription>
                            Daily submissions for the last {selectedDays} days
                            {selectedEvent !== "all" && eventStats ? ` — ${events.find(e => e.id === selectedEvent)?.title}` : " — All Events"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isChartLoading ? (
                            <div className="flex items-center justify-center h-[300px]">
                                <Skeleton className="w-full h-full rounded-lg" />
                            </div>
                        ) : timeline.length > 0 && timeline.some(p => p.submitted > 0) ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={timeline}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(v) => format(new Date(v + "T00:00:00"), "MMM dd")}
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip labelFormatter={(v) => format(new Date(v + "T00:00:00"), "MMM dd, yyyy")} />
                                    <Line
                                        type="monotone"
                                        dataKey="submitted"
                                        name="Submissions"
                                        stroke="#8884d8"
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="visits"
                                        name="Visits"
                                        stroke="#82ca9d"
                                        strokeWidth={1.5}
                                        dot={false}
                                        strokeDasharray="4 2"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                                No submissions in this period
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Conversion Funnel — only when a specific event is selected */}
                {selectedEvent !== "all" && eventStats ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Conversion Funnel</CardTitle>
                            <CardDescription>User journey from visit to submission</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={conversionFunnel}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        dataKey="value"
                                        label={({ name, value, percent = 0 }) =>
                                            `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                                        }
                                    >
                                        {conversionFunnel.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                ) : (
                    /* Top Events Bar Chart — only when "all" is selected */
                    <Card>
                        <CardHeader>
                            <CardTitle>Top 5 Events by Submissions</CardTitle>
                            <CardDescription>Events with the highest number of submissions</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <Skeleton className="w-full h-[300px] rounded-lg" />
                            ) : eventSubmissions.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={eventSubmissions} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" allowDecimals={false} />
                                        <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 12 }} />
                                        <Tooltip />
                                        <Bar dataKey="submissions" name="Submissions" fill="#8884d8" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                                    No events yet
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Conversion Rate Metrics — only shown for a specific event */}
            {selectedEvent !== "all" && eventStats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Visit → Start Rate</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-green-600">{visitToStartRate.toFixed(1)}%</div>
                            <p className="text-sm text-muted-foreground mt-1">
                                {eventStats.totalStarted} started / {eventStats.totalVisits} visitors
                            </p>
                            <div className="mt-3 w-full bg-muted rounded-full h-2">
                                <div className="bg-green-600 h-2 rounded-full transition-all" style={{ width: `${visitToStartRate}%` }} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Start → Submit Rate</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-600">{startToSubmitRate.toFixed(1)}%</div>
                            <p className="text-sm text-muted-foreground mt-1">
                                {eventStats.totalSubmitted} submitted / {eventStats.totalStarted} started
                            </p>
                            <div className="mt-3 w-full bg-muted rounded-full h-2">
                                <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${startToSubmitRate}%` }} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Overall Conversion</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-purple-600">{overallRate.toFixed(1)}%</div>
                            <p className="text-sm text-muted-foreground mt-1">
                                {eventStats.totalSubmitted} submitted / {eventStats.totalVisits} visitors
                            </p>
                            <div className="mt-3 w-full bg-muted rounded-full h-2">
                                <div className="bg-purple-600 h-2 rounded-full transition-all" style={{ width: `${overallRate}%` }} />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}

"use client"

import { useMemo } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import dynamic from "next/dynamic"

const EventFunnelChart = dynamic(
    () => import("@/components/analytics/AnalyticsCharts").then(mod => mod.EventFunnelChart),
    { ssr: false }
)
const DailyBarChart = dynamic(
    () => import("@/components/analytics/AnalyticsCharts").then(mod => mod.DailyBarChart),
    { ssr: false }
)
const TrendLineChart = dynamic(
    () => import("@/components/analytics/AnalyticsCharts").then(mod => mod.TrendLineChart),
    { ssr: false }
)
import { Download, Users, MousePointer, CheckCircle, DollarSign, TrendingUp, Eye, ArrowLeft } from "lucide-react"
import { useEvent } from "@/lib/query/hooks/useEvents"
import { useEventAnalytics, useDailyAnalytics } from "@/lib/query/hooks/useAnalytics"
import { useSubmissionsByEvent } from "@/lib/query/hooks/useSubmissions"
import { SubmissionTable } from "@/components/submission-table"

export default function EventAnalytics() {
    const params = useParams()
    const id = params.id as string

    const { data: event, isLoading: isLoadingEvent } = useEvent(id)
    const { data: analytics, isLoading: isLoadingAnalytics } = useEventAnalytics(id)
    const { data: dailyRaw = [], isLoading: isLoadingDaily } = useDailyAnalytics(id, 30)
    const { data: submissionsResult, isLoading: isLoadingSubmissions } = useSubmissionsByEvent(id)

    const submissions = submissionsResult?.items ?? []
    const isLoading = isLoadingEvent || isLoadingAnalytics || isLoadingDaily || isLoadingSubmissions

    const chartData = useMemo(() =>
        dailyRaw.map((d) => ({
            date: d.date.slice(5),   // "2026-03-06" → "03-06"
            visitors: d.visits,
            started: d.started,
            submitted: d.submitted,
        })),
        [dailyRaw]
    )

    const conversionRate = analytics && analytics.totalVisits > 0
        ? ((analytics.totalSubmitted / analytics.totalVisits) * 100).toFixed(1)
        : "0.0"

    const stats = [
        { title: "Total Visitors", value: String(analytics?.totalVisits ?? 0), icon: Users, color: "text-blue-600" },
        { title: "Started Filling", value: String(analytics?.totalStarted ?? 0), icon: MousePointer, color: "text-yellow-600" },
        { title: "Form Submitted", value: String(analytics?.totalSubmitted ?? 0), icon: CheckCircle, color: "text-green-600" },
        { title: "Revenue Collected", value: "₹0", icon: DollarSign, color: "text-emerald-600" },
    ]

    const conversionData = [
        { name: "Visited", value: analytics?.totalVisits ?? 0, color: "#8884d8" },
        { name: "Started", value: analytics?.totalStarted ?? 0, color: "#82ca9d" },
        { name: "Submitted", value: analytics?.totalSubmitted ?? 0, color: "#ffc658" },
    ]

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href="/dashboard/events">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{event?.title ?? "Loading..."}</h1>
                        <p className="text-muted-foreground">Analytics and responses for your event</p>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge variant={event?.status === "ACTIVE" ? "default" : "secondary"}>
                                {event?.status ? event.status.charAt(0) + event.status.slice(1).toLowerCase() : "..."}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                                Created on {event?.createdAt ? new Date(event.createdAt).toLocaleDateString() : ""}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" asChild>
                        <Link href={`/form/${event?.slug ?? ""}`} target="_blank">
                            <Eye className="mr-2 h-4 w-4" />
                            View Form
                        </Link>
                    </Button>
                    {/* <Button>
                        <Download className="mr-2 h-4 w-4" />
                        Export Data
                    </Button> */}
                </div>
            </div>

            {/* Stats Cards */}
            <Card>
                <CardContent className="p-6">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x">
                        {
                            isLoading
                                ? Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="flex flex-col gap-2 lg:px-6 first:lg:pl-0">
                                        <div className="flex items-center justify-between">
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-4 w-4" />
                                        </div>
                                        <Skeleton className="h-8 w-16" />
                                    </div>
                                ))
                                : stats.map((stat, index) => (
                                    <div key={index} className="flex flex-col gap-2 lg:px-6 first:lg:pl-0">
                                        <div className="flex items-center gap-2">
                                            <div className="text-xl font-bold">{stat.value}</div>
                                            <span className="text-sm font-medium">{stat.title}</span>
                                            <stat.icon className={`h-4 w-4 ${stat.color}`} />
                                        </div>
                                    </div>
                                ))
                        }
                    </div>
                </CardContent>
            </Card>

            {/* Conversion Rate */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Conversion Overview
                    </CardTitle>
                    <CardDescription>Overall conversion rate: {conversionRate}%</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <h4 className="text-sm font-medium mb-4">Conversion Funnel</h4>
                            <EventFunnelChart data={conversionData} />
                        </div>
                        <div>
                            <h4 className="text-sm font-medium mb-1">Daily Interactions</h4>
                            <p className="text-xs text-muted-foreground mb-3">Last 30 days</p>
                            {chartData.length > 0 ? (
                                <DailyBarChart data={chartData} />
                            ) : (
                                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                                    No daily data available yet
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Trend Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Interaction Trends</CardTitle>
                    <CardDescription>Track visitor behavior over time</CardDescription>
                </CardHeader>
                <CardContent>
                    {chartData.length > 0 ? (
                        <TrendLineChart data={chartData} />
                    ) : (
                        <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                            No daily data available yet
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Responses Table */}
            <SubmissionTable
                submissions={submissions}
                paymentEnabled={event?.paymentEnabled ?? false}
                title="Recent Responses"
            />
            <div className="flex justify-end">
                {event?.id ? (
                    <Button variant="outline" asChild>
                        <Link href={`/dashboard/event/${event.id}`} >
                            <Eye className="mr-2 h-4 w-4" />
                            View All Responses
                        </Link>
                    </Button>
                ) : (
                    <Button variant="outline" disabled>
                        <Eye className="mr-2 h-4 w-4" />
                        View All Responses
                    </Button>
                )}
            </div>
        </div>
    )
}

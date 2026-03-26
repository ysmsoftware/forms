"use client"

import { useMemo } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import { Skeleton } from "@/components/ui/skeleton"
import {
    Users,
    MousePointer,
    CheckCircle,
    TrendingUp,
    Edit,
    BarChart3,
    Copy,
    ArrowLeft,
    ExternalLink,
    FileText,
    CreditCard,
    Award,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { SendMessageDialog } from "@/components/send-message-dialog"
import { MessageSquare } from "lucide-react"
import { useEvent } from "@/lib/query/hooks/useEvents"
import { useEventAnalytics } from "@/lib/query/hooks/useAnalytics"
import { useSubmissionsByEvent } from "@/lib/query/hooks/useSubmissions"
import { format } from "date-fns"
import { SubmissionTable } from "@/components/submission-table"

const statusColor: Record<string, string> = {
    DRAFT: "bg-yellow-100 text-yellow-800 border-yellow-200",
    ACTIVE: "bg-green-100 text-green-800 border-green-200",
    CLOSED: "bg-gray-100 text-gray-800 border-gray-200",
}



export default function EventDetailPage() {
    const params = useParams()
    const id = params.id as string

    const { data: event, isLoading: isLoadingEvent } = useEvent(id)
    const { data: analytics, isLoading: isLoadingAnalytics } = useEventAnalytics(id)
    const { data: submissionsResult, isLoading: isLoadingSubmissions } = useSubmissionsByEvent(id)

    const submissions = useMemo(
        () => submissionsResult?.items ?? [],
        [submissionsResult]
    )

    const submitterContactIds = useMemo(
        () => submissions
            .filter(s => !!s.contact?.id)   // API returns nested contact object, never a flat contactId field
            .map(s => s.contact!.id)
            .filter((cid, idx, arr) => arr.indexOf(cid) === idx), // deduplicate
        [submissions]
    )
    const isLoading = isLoadingEvent || isLoadingAnalytics || isLoadingSubmissions

    const conversionRate =
        analytics && analytics.totalVisits > 0
            ? ((analytics.totalSubmitted / analytics.totalVisits) * 100).toFixed(1) + "%"
            : "0.0%"

    const handleCopyUrl = () => {
        if (!event) return
        const url = `${window.location.origin}/form/${event.slug}`
        navigator.clipboard.writeText(url)
        toast("Form URL copied to clipboard.")
    }

    /* ────────────────────── Loading state ────────────────────── */
    if (isLoading) {
        return (
            <div className="space-y-8">
                {/* Header skeleton */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center space-x-4">
                        <Skeleton className="h-10 w-10 rounded-md" />
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-64" />
                            <Skeleton className="h-4 w-40" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-28" />
                        <Skeleton className="h-10 w-36" />
                        <Skeleton className="h-10 w-36" />
                    </div>
                </div>

                {/* Stats skeleton */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-[120px] rounded-xl" />
                    ))}
                </div>

                {/* Quick info skeleton */}
                <Skeleton className="h-[160px] rounded-xl" />

                {/* Table skeleton */}
                <Skeleton className="h-[320px] rounded-xl" />
            </div>
        )
    }

    /* ────────────────────── Rendered page ────────────────────── */
    return (
        <div className="space-y-8">
            {/* ─── SECTION A — Header ─────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/dashboard/events">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight">
                                {event?.title}
                            </h1>
                            <Badge className={statusColor[event?.status ?? "DRAFT"]}>
                                {event?.status
                                    ? event.status.charAt(0) + event.status.slice(1).toLowerCase()
                                    : "—"}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                            Created{" "}
                            {event?.createdAt
                                ? format(new Date(event.createdAt), "MMM dd, yyyy")
                                : "—"}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={handleCopyUrl}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Form URL
                    </Button>
                    <SendMessageDialog
                        defaultEventId={id}
                        defaultEventLabel={event?.title}
                        defaultMode="bulk"
                        preSelectedContactIds={submitterContactIds}
                        onSuccess={() => toast("Messages queued for all submitters")}
                        trigger={
                            <Button variant="outline" disabled={submitterContactIds.length === 0}>
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Message Submitters
                                {submitterContactIds.length > 0 && (
                                    <Badge variant="secondary" className="ml-2 text-xs">
                                        {submitterContactIds.length}
                                    </Badge>
                                )}
                            </Button>
                        }
                    />
                    <Button variant="outline" asChild>
                        <Link href={`/dashboard/event/${id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Form
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href={`/dashboard/event/${id}/analytics`}>
                            <BarChart3 className="mr-2 h-4 w-4" />
                            View Analytics
                        </Link>
                    </Button>
                </div>
            </div>

            {/* ─── SECTION B — Stats row ───────────────────── */}
            <Card>
                <CardContent className="p-3">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x divide-border">
                        <div className=" lg:px-4">
                            <div className="flex items-center gap-2">
                                <div className="text-xl font-bold">
                                    {analytics?.totalVisits ?? 0}
                                </div>
                                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    Total Visitors
                                    <Users className="h-4 w-4 text-blue-600" />
                                </div>
                            </div>
                        </div>

                        <div className=" lg:px-4">
                            <div className="flex items-center gap-2">
                                <div className="text-xl font-bold">
                                    {analytics?.totalStarted ?? 0}
                                </div>
                                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    Started
                                    <MousePointer className="h-4 w-4 text-yellow-600" />
                                </div>

                            </div>

                        </div>

                        <div className=" lg:px-4">
                            <div className="flex items-center gap-2">
                                <div className="text-xl font-bold">
                                    {analytics?.totalSubmitted ?? 0}
                                </div>
                                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    Submitted
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                </div>

                            </div>
                        </div>

                        <div className=" lg:px-4">
                            <div className="flex items-center gap-2">
                                <div className="text-xl font-bold">{conversionRate}</div>
                                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    Conversion Rate
                                    <TrendingUp className="h-4 w-4 text-purple-600" />
                                </div>
                            </div>

                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ─── SECTION C — Quick Info ──────────────────── */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Info</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="flex items-start gap-3">
                            <ExternalLink className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-muted-foreground">
                                    Form URL
                                </p>
                                <a
                                    href={`/form/${event?.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary underline underline-offset-4 break-all"
                                >
                                    {typeof window !== "undefined"
                                        ? `${window.location.origin}/form/${event?.slug}`
                                        : `/form/${event?.slug}`}
                                </a>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <Award className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Certificate Template
                                </p>
                                <p className="text-sm">
                                    {event?.templateType
                                        ? event.templateType.charAt(0) +
                                        event.templateType.slice(1).toLowerCase()
                                        : "—"}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Payment Enabled
                                </p>
                                <p className="text-sm">
                                    {event?.paymentEnabled ? "Yes" : "No"}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ─── SECTION D — Submissions ─────────── */}
            <SubmissionTable
                submissions={submissions}
                paymentEnabled={event?.paymentEnabled ?? false}
                paginated={true}
                title="All Submissions"
            />
        </div>
    )
}

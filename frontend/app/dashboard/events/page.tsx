"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DateRange } from "react-day-picker"
import {
    Plus, Search, Edit, BarChart3, Copy, Users, DollarSign,
    MoreHorizontal, Trash2, FileText, ExternalLink, ListChecks,
    CalendarIcon, X
} from "lucide-react"
import Link from "next/link"
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useEvents, useDeleteEvent, useDuplicateEvent } from "@/lib/query/hooks/useEvents"
import { useEventAnalyticsMap } from "@/lib/query/hooks/useEventAnalyticsMap"
import { getStatusColor, copyFormUrl } from "@/lib/event-utils"

export default function EventsPage() {
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [dateRange, setDateRange] = useState<DateRange | undefined>()
    const [datePickerOpen, setDatePickerOpen] = useState(false)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

    const deleteEvent = useDeleteEvent()
    const duplicateEvent = useDuplicateEvent()

    const { data: events = [], isLoading } = useEvents()
    const { analyticsMap, isLoading: isAnalyticsLoading } = useEventAnalyticsMap(events)
    const isAnalyticsLoaded = !isAnalyticsLoading

    const filteredEvents = events.filter((e) => {
        const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesStatus = statusFilter === "all" || e.status === statusFilter
        const matchesDate = (() => {
            if (!dateRange?.from) return true
            try {
                const createdAt = new Date(e.createdAt)
                const from = startOfDay(dateRange.from)
                const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from)
                return isWithinInterval(createdAt, { start: from, end: to })
            } catch {
                return true
            }
        })()
        return matchesSearch && matchesStatus && matchesDate
    })


    if (isLoading) {
        return (
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-10 w-44" />
                </div>
                <Skeleton className="h-[56px] w-full rounded-xl" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-[280px] rounded-xl" />
                    ))}
                </div>
            </div>
        )
    }

    /* ─── Rendered page ─── */
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">My Events</h1>
                    <p className="text-muted-foreground">Create, manage, and track all your events.</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col xl:flex-row gap-6 xl:items-center">
                {/* Search box */}
                <div className="flex-1">
                    <Input
                        placeholder="Search events..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
                {/* Filter by status */}
                <div className="flex-1">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Date Range Picker */}
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className={cn(
                                "justify-start text-left font-normal whitespace-nowrap",
                                !dateRange?.from && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                            {dateRange?.from ? (
                                dateRange.to ? (
                                    <>
                                        {format(dateRange.from, "MMM dd, yyyy")} – {format(dateRange.to, "MMM dd, yyyy")}
                                    </>
                                ) : (
                                    format(dateRange.from, "MMM dd, yyyy")
                                )
                            ) : (
                                "Pick a date range"
                            )}
                            {dateRange?.from && (
                                <span
                                    role="button"
                                    className="ml-2 rounded-full hover:bg-muted p-0.5"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setDateRange(undefined)
                                    }}
                                >
                                    <X className="h-3 w-3" />
                                </span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={(range) => {
                                setDateRange(range)
                                // Close after selecting both start and end
                                if (range?.from && range?.to) {
                                    setDatePickerOpen(false)
                                }
                            }}
                            numberOfMonths={2}
                        />
                    </PopoverContent>
                </Popover>

                <div>
                    <Button asChild >
                        <Link href="/dashboard/create-event">
                            <Plus className="mr-2 h-4 w-4" />
                            Create New Event
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Event Count */}
            <p className="text-sm text-muted-foreground">
                Showing {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""}
            </p>

            {/* Events Grid */}
            {filteredEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEvents.map((event) => {
                        const a = analyticsMap[event.id]
                        return (
                            <Card key={event.id} className="hover:shadow-md transition-shadow flex flex-col group">
                                <CardHeader className="pb-3">
                                    {/* Title row + three-dot menu */}
                                    <div className="flex items-start justify-between gap-2">
                                        <CardTitle className="text-base font-semibold line-clamp-2 leading-snug">
                                            {event.title}
                                        </CardTitle>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 shrink-0 opacity-60 hover:opacity-100"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48">
                                                <DropdownMenuItem asChild>
                                                    <a href={`/form/${event.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                                                        <ExternalLink className="h-4 w-4" />
                                                        View Public Form
                                                    </a>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/dashboard/event/${event.id}/edit`} className="flex items-center gap-2">
                                                        <Edit className="h-4 w-4" />
                                                        Edit Form
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/dashboard/event/${event.id}`} className="flex items-center gap-2">
                                                        <ListChecks className="h-4 w-4" />
                                                        View Responses
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="flex items-center gap-2 cursor-pointer"
                                                    onClick={async () => { await copyFormUrl(event.slug); toast("URL copied!") }}
                                                >
                                                    <Copy className="h-4 w-4" />
                                                    Copy URL
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="flex items-center gap-2 cursor-pointer"
                                                    disabled={duplicateEvent.isPending}
                                                    onClick={async () => {
                                                        try {
                                                            await duplicateEvent.mutateAsync(event.id)
                                                            toast(`"${event.title}" duplicated`)
                                                        } catch {
                                                            toast.error("Failed to duplicate event")
                                                        }
                                                    }}
                                                >
                                                    <Copy className="h-4 w-4" />
                                                    Duplicate
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="flex items-center gap-2 text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30 cursor-pointer"
                                                    onClick={() => setDeleteConfirmId(event.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    {/* Status badge + created date on same row */}
                                    <div className="flex items-center justify-between mt-1.5">
                                        <Badge className={`${getStatusColor(event.status)} text-xs`}>
                                            {event.status.charAt(0) + event.status.slice(1).toLowerCase()}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                            Created{" "}
                                            {(() => {
                                                try { return format(new Date(event.createdAt), "MMM dd, yyyy") }
                                                catch { return event.createdAt }
                                            })()}
                                        </span>
                                    </div>

                                    {/* Description snippet (optional, subtle) */}
                                    {event.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5">
                                            {event.description}
                                        </p>
                                    )}
                                </CardHeader>

                                <CardContent className="flex-1 flex flex-col justify-between space-y-4 pt-0">
                                    {/* Stats: inline labeled rows */}
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4 text-blue-500 shrink-0" />
                                            <span className="text-sm text-muted-foreground">Visitors:</span>
                                            <span className="text-sm font-semibold ml-auto">
                                                {!isAnalyticsLoading ? (a?.totalVisits ?? 0) : <Skeleton className="h-4 w-8 inline-block" />}
                                            </span>
                                            {/* Submissions inline on same row if available */}
                                            <span className="text-sm text-muted-foreground ml-4 hidden sm:inline">Submissions:</span>
                                            <span className="text-sm font-semibold hidden sm:inline">
                                                {!isAnalyticsLoading ? (a?.totalSubmitted ?? 0) : <Skeleton className="h-4 w-8 inline-block" />}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <DollarSign className="h-4 w-4 text-green-500 shrink-0" />
                                            <span className="text-sm text-muted-foreground">Revenue:</span>
                                            <span className="text-sm font-semibold ml-auto">
                                                ₹{!isAnalyticsLoading ? ((a as any)?.totalRevenue ?? 0).toLocaleString("en-IN") : "—"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Bottom action buttons: Analytics + Edit only */}
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" asChild className="flex-1">
                                            <Link href={`/dashboard/event/${event.id}/analytics`}>
                                                <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
                                                Analytics
                                            </Link>
                                        </Button>
                                        <Button size="sm" variant="outline" asChild className="flex-1">
                                            <Link href={`/dashboard/event/${event.id}/edit`}>
                                                <Edit className="mr-1.5 h-3.5 w-3.5" />
                                                Edit
                                            </Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            ) : (
                /* Empty state */
                <Card>
                    <CardContent className="text-center py-16">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">
                            {searchTerm || statusFilter !== "all"
                                ? "No events match your filters"
                                : "No events yet"}
                        </h3>
                        <p className="text-muted-foreground mb-6">
                            {searchTerm || statusFilter !== "all"
                                ? "Try adjusting your search or filter to see more events."
                                : "Create your first event to start collecting responses."}
                        </p>
                        {!searchTerm && statusFilter === "all" && (
                            <Button asChild>
                                <Link href="/dashboard/create-event">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Your First Event
                                </Link>
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}
            <AlertDialog
                open={!!deleteConfirmId}
                onOpenChange={(v) => { if (!v) setDeleteConfirmId(null) }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Event?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the event and all its submissions. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={deleteEvent.isPending}
                            onClick={async () => {
                                if (!deleteConfirmId) return
                                try {
                                    await deleteEvent.mutateAsync(deleteConfirmId)
                                    toast("Event deleted")
                                } catch {
                                    toast.error("Failed to delete event")
                                } finally {
                                    setDeleteConfirmId(null)
                                }
                            }}
                        >
                            {deleteEvent.isPending ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

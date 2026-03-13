"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Search, MoreHorizontal, Eye, Edit, Copy, BarChart3, TrendingUp, Users, FileText, CheckCircle } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { useEvents } from "@/lib/query/hooks/useEvents"
import { useAllEventAnalytics } from "@/lib/query/hooks/useAnalytics"

export default function Dashboard() {
    const [searchTerm, setSearchTerm] = useState("")

    const { data: events = [], isLoading } = useEvents()
    const analyticsResults = useAllEventAnalytics(events)

    // Build analytics map from useQueries results
    const analyticsMap = Object.fromEntries(
        events.map((e, i) => [e.id, analyticsResults[i]?.data])
    )
    const isAnalyticsLoading = analyticsResults.some(r => r.isLoading)

    const totalVisits = analyticsResults.reduce((s, r) => s + (r.data?.totalVisits ?? 0), 0)
    const totalSubmissions = analyticsResults.reduce((s, r) => s + (r.data?.totalSubmitted ?? 0), 0)

    const stats = [
        { title: "Total Events", value: events.length.toString(), icon: FileText, color: "text-blue-600" },
        { title: "Total Visitors", value: isAnalyticsLoading ? "..." : totalVisits.toString(), icon: Users, color: "text-green-600" },
        { title: "Total Submissions", value: isAnalyticsLoading ? "..." : totalSubmissions.toString(), icon: CheckCircle, color: "text-purple-600" },
    ]

    const filteredEvents = events.filter((event) =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleCopyUrl = (slug: string) => {
        const url = `${window.location.origin}/form/${slug}`
        navigator.clipboard.writeText(url)
        toast.success("Form URL copied!")
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">Welcome back! Here's what's happening with your forms.</p>
                </div>
                <Button asChild>
                    <Link href="/dashboard/create-event">
                        <Plus className="mr-2 h-4 w-4" />
                        Create New Event
                    </Link>
                </Button>
            </div>

            {/* Stats cards */}
            <Card>
                <CardContent className="p-6">
                    <div className="grid gap-4 sm:grid-cols-3 lg:divide-x">
                        {isLoading
                            ? Array.from({ length: 3 }).map((_, i) => (
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
                            ))}
                    </div>
                </CardContent>
            </Card>

            {/* Recent events table */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle>Recent Events</CardTitle>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search events..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 w-full sm:w-[300px]"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Event Title</TableHead>
                                <TableHead className="text-center">Visits</TableHead>
                                <TableHead className="text-center">Started</TableHead>
                                <TableHead className="text-center">Submitted</TableHead>
                                <TableHead className="text-center">Revenue</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-center">Created</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading
                                ? Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={8}>
                                            <Skeleton className="h-6 w-full" />
                                        </TableCell>
                                    </TableRow>
                                ))
                                : filteredEvents.map((event) => (
                                    <TableRow key={event.id}>
                                        <TableCell className="font-medium">{event.title}</TableCell>
                                        <TableCell className="text-center">{analyticsMap[event.id]?.totalVisits ?? "—"}</TableCell>
                                        <TableCell className="text-center">{analyticsMap[event.id]?.totalStarted ?? "—"}</TableCell>
                                        <TableCell className="text-center">{analyticsMap[event.id]?.totalSubmitted ?? "—"}</TableCell>
                                        <TableCell className="text-center">₹0</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={event.status === "ACTIVE" ? "default" : "secondary"}>
                                                {event.status.toLowerCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">{new Date(event.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/dashboard/event/${event.id}`}><Eye className="mr-2 h-4 w-4" />View</Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/dashboard/event/${event.id}/edit`}><Edit className="mr-2 h-4 w-4" />Edit Form</Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/dashboard/event/${event.id}/analytics`}><BarChart3 className="mr-2 h-4 w-4" />View Analytics</Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleCopyUrl(event.slug)}>
                                                        <Copy className="mr-2 h-4 w-4" />Copy URL
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}

"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { useMessages, useSendMessage } from "@/lib/query/hooks/useMessages"
import type { MessageType, MessageTemplate, MessageLog } from "@/lib/api/messages"
import { cn } from "@/lib/utils"
import {
    Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"
import { Send, Mail, Phone, MessageSquare, RefreshCw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react"
import { SendMessageDialog } from "@/components/send-message-dialog"
import { formatDistanceToNow } from "date-fns"
import dynamic from "next/dynamic"

const DeliveryDonut = dynamic(
    () => import("@/components/analytics/AnalyticsCharts").then(mod => mod.DeliveryDonut),
    { ssr: false }
)

const toTitleCase = (s: string) =>
    s.split("_").map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(" ")

export default function MessagesPage() {
    const [searchTerm, setSearchTerm] = useState("")
    const [typeFilter, setTypeFilter] = useState<"ALL" | MessageType>("ALL")
    const [statusFilter, setStatusFilter] = useState("ALL")

    // File State Upgrades
    const [resendingId, setResendingId] = useState<string | null>(null)
    const [detailMsg, setDetailMsg] = useState<MessageLog | null>(null)
    const [sortKey, setSortKey] = useState<"sentAt" | "createdAt" | "contact" | "status">("createdAt")
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
    const [retryingAll, setRetryingAll] = useState(false)
    const PAGE_SIZE = 15
    const [currentPage, setCurrentPage] = useState(1)

    const toggleSort = (key: typeof sortKey) => {
        if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
        else { setSortKey(key); setSortDir("desc") }
    }

    // Data Hooks
    const { data: queryData, isLoading } = useMessages(
        { limit: 1000 },
        {
            refetchInterval: (query: any) => {
                const d = query.state.data?.data ?? []
                const hasActive = d.some(
                    (m: any) => m.status === "QUEUED" || m.status === "PROCESSING"
                )
                return hasActive ? 4000 : false
            }
        }
    )
    const data = queryData?.data ?? []
    const sendMessage = useSendMessage()

    const filtered = useMemo(() => {
        return data
            .filter(m => typeFilter === "ALL" || m.type === typeFilter)
            .filter(m => statusFilter === "ALL" || m.status === statusFilter)
            .filter(m => {
                if (!searchTerm) return true
                const s = searchTerm.toLowerCase()
                return (m.contact?.name?.toLowerCase().includes(s) || m.contact?.email?.toLowerCase().includes(s)) ?? false
            })
            .sort((a, b) => {
                let av: any, bv: any
                if (sortKey === "sentAt") { av = a.sentAt ?? a.createdAt; bv = b.sentAt ?? b.createdAt }
                else if (sortKey === "createdAt") { av = a.createdAt; bv = b.createdAt }
                else if (sortKey === "contact") { av = a.contact?.name ?? ""; bv = b.contact?.name ?? "" }
                else if (sortKey === "status") { av = a.status; bv = b.status }
                const cmp = av < bv ? -1 : av > bv ? 1 : 0
                return sortDir === "asc" ? cmp : -cmp
            })
    }, [data, typeFilter, statusFilter, searchTerm, sortKey, sortDir])

    const prevFiltersRef = useRef({ searchTerm, typeFilter, statusFilter, sortKey, sortDir })
    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm, typeFilter, statusFilter, sortKey, sortDir])

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

    const stats = useMemo(() => ({
        total: data.length,
        sent: data.filter(m => m.status === "SENT").length,
        failed: data.filter(m => m.status === "FAILED").length,
        queued: data.filter(m => m.status === "QUEUED").length,
    }), [data])

    const handleClearFilters = () => {
        setSearchTerm("")
        setTypeFilter("ALL")
        setStatusFilter("ALL")
    }

    const handleRetryAllFailed = async () => {
        const failedMessages = filtered.filter(m => m.status === "FAILED")
        if (failedMessages.length === 0) return
        setRetryingAll(true)
        let successCount = 0
        let failCount = 0
        for (const m of failedMessages) {
            try {
                await sendMessage.mutateAsync({
                    contactId: m.contactId,
                    eventId: m.eventId,
                    type: m.type,
                    template: m.template as MessageTemplate,
                })
                successCount++
            } catch {
                failCount++
            }
        }
        setRetryingAll(false)
        if (failCount === 0) toast.info(`${successCount} failed message${successCount !== 1 ? "s" : ""} retried successfully`)
        else toast.error(`${successCount} retried, ${failCount} still failing`)
    }

    return (
        <TooltipProvider>
            <div className="space-y-8">
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {/* <div>
                        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
                        <p className="text-muted-foreground">Message delivery logs</p>
                    </div> */}
                    {/* Stats bar */}
                    <Card>
                        <CardContent className="py-4 px-5">
                            <div className="flex flex-wrap items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                    <span className="text-2xl font-bold">{stats.total}</span>
                                    <span className="text-sm text-muted-foreground">Total</span>
                                </div>
                                <div className="w-px h-6 bg-border hidden sm:block" />
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                                    <span className="text-2xl font-bold">{stats.sent}</span>
                                    <span className="text-sm text-muted-foreground">Sent</span>
                                </div>
                                <div className="w-px h-6 bg-border hidden sm:block" />
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                    <span className="text-2xl font-bold">{stats.failed}</span>
                                    <span className="text-sm text-muted-foreground">Failed</span>
                                </div>
                                <div className="w-px h-6 bg-border hidden sm:block" />
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                                    <span className="text-2xl font-bold">{stats.queued}</span>
                                    <span className="text-sm text-muted-foreground">Queued</span>
                                </div>
                                <div className="w-px h-6 bg-border hidden sm:block" />
                                {/* Delivery Rate donut — keep existing Recharts PieChart here, inline */}
                                <div className="flex items-center gap-3 ml-auto">
                                    <div className="w-12 h-12">
                                        <DeliveryDonut data={[
                                            { name: "Sent", value: stats.sent },
                                            { name: "Failed", value: stats.failed },
                                            { name: "Queued", value: stats.queued },
                                        ]} />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold leading-none">{stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0}%</p>
                                        <p className="text-xs text-muted-foreground">delivery rate</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <div className="flex items-center gap-2">
                        {stats.failed > 0 && (
                            <Button
                                variant="outline"
                                className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                                onClick={handleRetryAllFailed}
                                disabled={retryingAll}
                            >
                                {retryingAll
                                    ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Retrying...</>
                                    : <><RefreshCw className="h-4 w-4 mr-2" />Retry All Failed ({stats.failed})</>
                                }
                            </Button>
                        )}
                        <SendMessageDialog
                            trigger={<Button><Send className="h-4 w-4 mr-2" />Send Message</Button>}
                        />
                    </div>
                </div>

                {/* Filter bar */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Input
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full"
                        />
                    </div>
                    <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as "ALL" | MessageType)}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Channel" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Channels</SelectItem>
                            <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                            <SelectItem value="EMAIL">Email</SelectItem>
                            <SelectItem value="SMS">SMS</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Statuses</SelectItem>
                            <SelectItem value="SENT">Sent</SelectItem>
                            <SelectItem value="QUEUED">Queued</SelectItem>
                            <SelectItem value="PROCESSING">Processing</SelectItem>
                            <SelectItem value="FAILED">Failed</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="ghost" onClick={handleClearFilters}>
                        Clear
                    </Button>
                </div>

                {/* Table */}
                <Card>
                    {isLoading ? (
                        <div className="p-6 space-y-2">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-12 flex flex-col items-center">
                            <Send className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">No messages found</h3>
                            <p className="text-sm text-muted-foreground">
                                Try adjusting your filters or send a new message
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("contact")}>
                                            <div className="flex items-center gap-1">
                                                Contact
                                                {sortKey === "contact" ? (
                                                    sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                                                ) : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
                                            </div>
                                        </TableHead>
                                        <TableHead>Event</TableHead>
                                        <TableHead>Channel</TableHead>
                                        <TableHead>Template</TableHead>
                                        <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("status")}>
                                            <div className="flex items-center gap-1">
                                                Status
                                                {sortKey === "status" ? (
                                                    sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                                                ) : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
                                            </div>
                                        </TableHead>
                                        <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("sentAt")}>
                                            <div className="flex items-center gap-1">
                                                Sent At
                                                {sortKey === "sentAt" ? (
                                                    sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                                                ) : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
                                            </div>
                                        </TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginated.map((m) => (
                                        <TableRow key={m.id} className="cursor-pointer hover:bg-accent/50" onClick={() => setDetailMsg(m)}>
                                            <TableCell>
                                                <div className="font-medium">{m.contact?.name ?? "—"}</div>
                                                <div className="text-xs text-muted-foreground block">
                                                    {m.contact?.email ?? "—"}
                                                </div>
                                            </TableCell>
                                            <TableCell>{m.event?.title ?? "—"}</TableCell>
                                            <TableCell>
                                                <div className="flex gap-1 w-max">
                                                    {m.type === "WHATSAPP" && (
                                                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 pointer-events-none" variant="outline">
                                                            <MessageSquare className="h-3 w-3 flex-shrink-0 mr-1" /> WhatsApp
                                                        </Badge>
                                                    )}
                                                    {m.type === "EMAIL" && (
                                                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 pointer-events-none" variant="outline">
                                                            <Mail className="h-3 w-3 flex-shrink-0 mr-1" /> Email
                                                        </Badge>
                                                    )}
                                                    {m.type === "SMS" && (
                                                        <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 pointer-events-none" variant="outline">
                                                            <Phone className="h-3 w-3 flex-shrink-0 mr-1" /> SMS
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>{toTitleCase(m.template)}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {m.status === "SENT" && <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 pointer-events-none border-transparent">Sent</Badge>}
                                                    {m.status === "QUEUED" && <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300 pointer-events-none border-transparent">Queued</Badge>}
                                                    {m.status === "PROCESSING" && <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 pointer-events-none border-transparent">Processing</Badge>}
                                                    {m.status === "FAILED" && <Badge className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 pointer-events-none border-transparent">Failed</Badge>}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {m.sentAt ? (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="cursor-default whitespace-nowrap text-sm">
                                                                {formatDistanceToNow(new Date(m.sentAt), { addSuffix: true })}
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            {new Date(m.sentAt).toLocaleString("en-IN")}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div onClick={(e) => e.stopPropagation()}>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={async () => {
                                                            setResendingId(m.id)
                                                            try {
                                                                await sendMessage.mutateAsync({
                                                                    contactId: m.contactId,
                                                                    eventId: m.eventId,
                                                                    type: m.type,
                                                                    template: m.template as MessageTemplate,
                                                                })
                                                                toast.success("Retry command sent")
                                                            } catch (err: any) {
                                                                toast.error("Failed to retry message")
                                                            } finally {
                                                                setResendingId(null)
                                                            }
                                                        }}
                                                        disabled={resendingId === m.id}
                                                    >
                                                        <RefreshCw className={cn("h-4 w-4 mr-2", resendingId === m.id ? "animate-spin" : "")} />
                                                        {resendingId === m.id ? "Sending..." : "Resend"}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t">
                            <p className="text-sm text-muted-foreground">
                                Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} messages
                            </p>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                {/* Page number pills — show max 5 pages around current */}
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                    .reduce<(number | "...")[]>((acc, p, i, arr) => {
                                        if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...")
                                        acc.push(p)
                                        return acc
                                    }, [])
                                    .map((p, i) =>
                                        p === "..." ? (
                                            <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground text-sm">…</span>
                                        ) : (
                                            <Button
                                                key={p}
                                                variant={currentPage === p ? "default" : "outline"}
                                                size="sm"
                                                className="w-8 h-8 p-0"
                                                onClick={() => setCurrentPage(p as number)}
                                            >
                                                {p}
                                            </Button>
                                        )
                                    )
                                }
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>

                <Sheet open={!!detailMsg} onOpenChange={(v) => { if (!v) setDetailMsg(null) }}>
                    <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                        <SheetHeader>
                            <SheetTitle>Message Details</SheetTitle>
                            <SheetDescription>Full delivery log for this message</SheetDescription>
                        </SheetHeader>
                        {detailMsg && (
                            <div className="mt-6 space-y-6">
                                {/* Contact */}
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Contact</p>
                                    <p className="font-medium">{detailMsg.contact?.name ?? "—"}</p>
                                    <p className="text-sm text-muted-foreground">{detailMsg.contact?.email} • {detailMsg.contact?.phone}</p>
                                </div>
                                {/* Event */}
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Event</p>
                                    <p className="font-medium">{detailMsg.event?.title ?? "None"}</p>
                                </div>
                                {/* Channel + Template */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Channel</p>
                                        <p className="font-medium">{detailMsg.type}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Template</p>
                                        <p className="font-medium">{toTitleCase(detailMsg.template)}</p>
                                    </div>
                                </div>
                                {/* Status + Attempts */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Status</p>
                                        <p className="font-medium">{detailMsg.status}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Attempts</p>
                                        <p className="font-medium">{detailMsg.attemptCount}</p>
                                    </div>
                                </div>
                                {/* Timestamps */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Created</p>
                                        <p className="text-sm">{new Date(detailMsg.createdAt).toLocaleString("en-IN")}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Sent At</p>
                                        <p className="text-sm">{detailMsg.sentAt ? new Date(detailMsg.sentAt).toLocaleString("en-IN") : "—"}</p>
                                    </div>
                                </div>
                                {/* Params */}
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Template Params</p>
                                    <pre className="bg-muted rounded-md p-3 text-xs overflow-x-auto whitespace-pre-wrap break-words">
                                        {JSON.stringify(detailMsg.params, null, 2)}
                                    </pre>
                                </div>
                                {/* Provider Response */}
                                {detailMsg.providerResponse && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Provider Response</p>
                                        <pre className="bg-muted rounded-md p-3 text-xs overflow-x-auto whitespace-pre-wrap break-words">
                                            {JSON.stringify(detailMsg.providerResponse, null, 2)}
                                        </pre>
                                    </div>
                                )}
                                {/* Error */}
                                {detailMsg.errorMessage && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Error</p>
                                        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-md p-3">{detailMsg.errorMessage}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </SheetContent>
                </Sheet>
            </div>
        </TooltipProvider>
    )
}

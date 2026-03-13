"use client"

import { useState, useMemo } from "react"
import { Award, Download, RefreshCw, Send, CheckCircle2, Clock, Loader2, XCircle, ChevronDown, MessageSquare } from "lucide-react"
import { IssueCertificateDialog } from "@/components/issue-certificate-dialog"
import { SendCertificateDialog } from "@/components/send-certificate-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { useEvents } from "@/lib/query/hooks/useEvents"
import { useSubmissionsByEvent } from "@/lib/query/hooks/useSubmissions"
import {
    useCertificatesByEvent,
    useIssueCertificate,
    useIssueCertificateBulk,
} from "@/lib/query/hooks/useCertificate"
import type { CertificateStatus } from "@/lib/api/certificate"
import { format } from "date-fns"

// ─── Status badge config ────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
    CertificateStatus,
    { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: React.ReactNode }
> = {
    GENERATED: {
        label: "Generated",
        variant: "default",
        icon: <CheckCircle2 className="h-3 w-3" />,
    },
    QUEUED: {
        label: "Queued",
        variant: "secondary",
        icon: <Clock className="h-3 w-3" />,
    },
    PROCESSING: {
        label: "Processing",
        variant: "secondary",
        icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    FAILED: {
        label: "Failed",
        variant: "destructive",
        icon: <XCircle className="h-3 w-3" />,
    },
}

function StatusBadge({ status }: { status: CertificateStatus }) {
    const cfg = STATUS_CONFIG[status]
    return (
        <Badge variant={cfg.variant} className="flex items-center gap-1 w-fit">
            {cfg.icon}
            {cfg.label}
        </Badge>
    )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CertificatesPage() {
    const { toast } = useToast()
    const [selectedEventId, setSelectedEventId] = useState<string>("")
    const [issuingId, setIssuingId] = useState<string | null>(null)

    // ── Data fetching ──────────────────────────────────────────────────────
    const { data: events = [], isLoading: isLoadingEvents } = useEvents()

    const selectedEvent = useMemo(
        () => events.find((e) => e.id === selectedEventId) ?? null,
        [events, selectedEventId]
    )

    const { data: submissionsResult, isLoading: isLoadingSubmissions } =
        useSubmissionsByEvent(selectedEventId)

    const submissions = useMemo(
        () => submissionsResult?.items ?? [],
        [submissionsResult]
    )

    const { data: certificates = [], isLoading: isLoadingCerts, refetch: refetchCerts } =
        useCertificatesByEvent(selectedEventId, { enabled: !!selectedEventId })

    // ── Mutations ──────────────────────────────────────────────────────────
    const issueSingle = useIssueCertificate(selectedEventId)
    const issueBulk = useIssueCertificateBulk(selectedEventId)

    // ── Derived data ───────────────────────────────────────────────────────

    // Map submissionId → certificate for O(1) lookup in the table
    const certBySubmissionId = useMemo(
        () => new Map(certificates.map((c) => [c.submissionId, c])),
        [certificates]
    )

    // Only SUBMITTED submissions are eligible for certificates
    const eligibleSubmissions = useMemo(
        () => submissions.filter((s) => s.status === "SUBMITTED"),
        [submissions]
    )

    // submissionIds that don't yet have a GENERATED cert — used for "Issue All"
    const unissuedSubmissionIds = useMemo(
        () =>
            eligibleSubmissions
                .filter((s) => {
                    const cert = certBySubmissionId.get(s.id)
                    return !cert || cert.status === "FAILED"
                })
                .map((s) => s.id),
        [eligibleSubmissions, certBySubmissionId]
    )

    const issuedCount = useMemo(
        () => certificates.filter((c) => c.status === "GENERATED").length,
        [certificates]
    )

    const isLoading = isLoadingSubmissions || isLoadingCerts

    // Map contactId → submissionId for the IssueCertificateDialog
    const submissionIdMap = useMemo(() => {
        const map: Record<string, string> = {}
        for (const s of eligibleSubmissions) {
            if (s.contact?.id) {
                map[s.contact.id] = s.id
            }
        }
        return map
    }, [eligibleSubmissions])

    // ── Handlers ───────────────────────────────────────────────────────────

    function handleIssueOne(submissionId: string) {
        setIssuingId(submissionId)
        issueSingle.mutate(submissionId, {
            onSuccess: () => {
                toast({ description: "Certificate queued for generation." })
                setIssuingId(null)
            },
            onError: (err: Error) => {
                toast({ variant: "destructive", description: err.message || "Failed to issue certificate." })
                setIssuingId(null)
            },
        })
    }

    function handleIssueAll() {
        if (unissuedSubmissionIds.length === 0) return
        issueBulk.mutate(unissuedSubmissionIds, {
            onSuccess: (result) => {
                toast({
                    description: `${result.summary.queued} certificate(s) queued, ${result.summary.failed} failed.`,
                })
            },
            onError: (err: Error) => {
                toast({ variant: "destructive", description: err.message || "Bulk issue failed." })
            },
        })
    }

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <div className="space-y-8">

            {/* ─── Header ─────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Award className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Certificates</h1>
                        <p className="text-sm text-muted-foreground">
                            Issue and manage certificates for event participants
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {selectedEventId && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refetchCerts()}
                            disabled={isLoadingCerts}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingCerts ? "animate-spin" : ""}`} />
                            Refresh
                        </Button>
                    )}
                    {selectedEventId && unissuedSubmissionIds.length > 0 && (
                        <Button
                            onClick={handleIssueAll}
                            disabled={issueBulk.isPending}
                            size="sm"
                        >
                            {issueBulk.isPending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4 mr-2" />
                            )}
                            Issue All ({unissuedSubmissionIds.length})
                        </Button>
                    )}
                </div>
            </div>

            {/* ─── Event selector ──────────────────────────────────────── */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Select Event</CardTitle>
                    <CardDescription>
                        Choose an event to view and manage its certificates
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingEvents ? (
                        <Skeleton className="h-10 w-64" />
                    ) : (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full sm:w-64 justify-between">
                                    <span className="truncate">
                                        {selectedEvent ? selectedEvent.title : "Choose an event…"}
                                    </span>
                                    <ChevronDown className="h-4 w-4 ml-2 shrink-0 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-64">
                                {events.length === 0 ? (
                                    <DropdownMenuItem disabled>No events found</DropdownMenuItem>
                                ) : (
                                    events.map((event) => (
                                        <DropdownMenuItem
                                            key={event.id}
                                            onSelect={() => setSelectedEventId(event.id)}
                                        >
                                            {event.title}
                                        </DropdownMenuItem>
                                    ))
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </CardContent>
            </Card>

            {/* ─── No event selected ───────────────────────────────────── */}
            {!selectedEventId && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
                    <Award className="h-12 w-12 text-muted-foreground/40 mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">No event selected</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                        Pick an event above to view its certificate status
                    </p>
                </div>
            )}

            {/* ─── Summary stats ────────────────────────────────────────── */}
            {selectedEventId && (
                <>
                    {isLoading ? (
                        <Skeleton className="h-12 rounded-xl" />
                    ) : (
                        <Card>
                            <CardContent className="py-3 px-4 flex items-center gap-6 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">Eligible Submissions</span>
                                    <span className="text-lg font-bold">{eligibleSubmissions.length}</span>
                                </div>
                                <div className="h-6 w-px bg-border" />
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-bold text-green-600">{issuedCount}</span>
                                    <span className="text-sm text-muted-foreground">Certificates Issued</span>
                                </div>
                                <div className="h-6 w-px bg-border" />
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-bold text-orange-500">{unissuedSubmissionIds.length}</span>
                                    <span className="text-sm text-muted-foreground">Pending / Failed</span>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* ─── Certificates table ───────────────────────────── */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Participant Certificates</CardTitle>
                            <CardDescription>
                                {selectedEvent?.title} — {eligibleSubmissions.length} eligible submission
                                {eligibleSubmissions.length !== 1 ? "s" : ""}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isLoading ? (
                                <div className="p-6 space-y-3">
                                    {[0, 1, 2, 3].map((i) => (
                                        <Skeleton key={i} className="h-12 w-full rounded-md" />
                                    ))}
                                </div>
                            ) : eligibleSubmissions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                                    <Award className="h-10 w-10 text-muted-foreground/40 mb-3" />
                                    <p className="font-medium text-muted-foreground">No submitted entries yet</p>
                                    <p className="text-sm text-muted-foreground/70 mt-1">
                                        Certificates can only be issued to completed submissions
                                    </p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Participant</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Issued At</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {eligibleSubmissions.map((submission) => {
                                            const cert = certBySubmissionId.get(submission.id)
                                            const contactName =
                                                submission.contact?.name ?? cert?.contact?.name ?? "—"
                                            const contactEmail =
                                                submission.contact?.email ?? cert?.contact?.email ?? "—"

                                            return (
                                                <TableRow key={submission.id}>
                                                    <TableCell className="font-medium">
                                                        {contactName}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground text-sm">
                                                        {contactEmail}
                                                    </TableCell>
                                                    <TableCell>
                                                        {cert ? (
                                                            <StatusBadge status={cert.status} />
                                                        ) : (
                                                            <Badge variant="outline" className="text-muted-foreground">
                                                                Not issued
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {cert?.issuedAt
                                                            ? format(new Date(cert.issuedAt), "MMM dd, yyyy")
                                                            : "—"}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {/* Download — only when GENERATED */}
                                                            {cert?.status === "GENERATED" && cert.fileUrl && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    asChild
                                                                >
                                                                    <a
                                                                        href={cert.fileUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        download={cert.fileName ?? undefined}
                                                                    >
                                                                        <Download className="h-4 w-4 mr-1" />
                                                                        Download
                                                                    </a>
                                                                </Button>
                                                            )}

                                                            {/* Send Certificate Notification — only when GENERATED */}
                                                            {cert?.status === "GENERATED" && (
                                                                <SendCertificateDialog
                                                                    contactId={submission.contact?.id ?? cert.contact?.id ?? ""}
                                                                    contactName={submission.contact?.name ?? cert.contact?.name ?? ""}
                                                                    eventId={selectedEventId}
                                                                    eventTitle={selectedEvent?.title ?? ""}
                                                                    certificateFileUrl={cert.fileUrl ?? ""}
                                                                    trigger={
                                                                        <Button variant="ghost" size="sm">
                                                                            <MessageSquare className="h-4 w-4 mr-1" />
                                                                            Send
                                                                        </Button>
                                                                    }
                                                                    onSuccess={() => toast({ description: "Certificate notification queued." })}
                                                                />
                                                            )}

                                                            {/* Issue / Retry button (direct) */}
                                                            {(!cert || cert.status === "FAILED") && (
                                                                <Button
                                                                    size="sm"
                                                                    variant={cert?.status === "FAILED" ? "destructive" : "default"}
                                                                    disabled={issuingId !== null || issueSingle.isPending}
                                                                    onClick={() => handleIssueOne(submission.id)}
                                                                >
                                                                    {issuingId === submission.id ? (
                                                                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                                                    ) : (
                                                                        <Send className="h-4 w-4 mr-1" />
                                                                    )}
                                                                    {cert?.status === "FAILED" ? "Retry" : "Issue"}
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}

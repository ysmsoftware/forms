"use client"

import React, { useState, useMemo, useEffect } from "react"
import {
  Award,
  Download,
  RefreshCw,
  Send,
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
  ChevronDown,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { IssueCertificateDialog } from "@/components/issue-certificate-dialog"
import { SendCertificateDialog } from "@/components/send-certificate-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { useEvents } from "@/lib/query/hooks/useEvents"
import { useSubmissionsByEvent } from "@/lib/query/hooks/useSubmissions"
import { useCertificatesByEvent, useIssueCertificate, useIssueCertificateBulk } from "@/lib/query/hooks/useCertificate"
import type { CertificateStatus } from "@/lib/api/certificate"
import { format } from "date-fns"
import { getSubmissionsByEvent } from "@/lib/api/submissions"

const STATUS_CONFIG: Record<CertificateStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  GENERATED: { label: "Generated", variant: "default" },
  QUEUED: { label: "Queued", variant: "secondary" },
  PROCESSING: { label: "Processing", variant: "secondary" },
  FAILED: { label: "Failed", variant: "destructive" },
}

function StatusBadge({ status }: { status: CertificateStatus }) {
  const cfg = STATUS_CONFIG[status]
  const icons = {
    GENERATED: <CheckCircle2 className="h-3 w-3" />,
    QUEUED: <Clock className="h-3 w-3" />,
    PROCESSING: <Loader2 className="h-3 w-3 animate-spin" />,
    FAILED: <XCircle className="h-3 w-3" />,
  }
  return (
    <Badge variant={cfg.variant} className="flex items-center gap-1 w-fit">
      {icons[status]}
      {cfg.label}
    </Badge>
  )
}

export function EventCertificatesTab() {
  const [selectedEventId, setSelectedEventId] = useState<string>("")
  const [issuingId, setIssuingId] = useState<string | null>(null)
  const [submissionsPage, setSubmissionsPage] = useState(1)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false)
  const [issueAllModalOpen, setIssueAllModalOpen] = useState(false)
  const [fetchingUnissued, setFetchingUnissued] = useState(false)
  const [unissuedSubmissionIds, setUnissuedSubmissionIds] = useState<string[]>([])

  const itemsPerPage = 20

  const { data: events = [], isLoading: isLoadingEvents } = useEvents()

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) ?? null,
    [events, selectedEventId]
  )

  // Reset page when event changes
  useEffect(() => {
    setSubmissionsPage(1)
  }, [selectedEventId])

  const { data: submissionsResult, isLoading: isLoadingSubmissions } = useSubmissionsByEvent(selectedEventId, {
    limit: itemsPerPage,
    page: submissionsPage,
    status: "SUBMITTED",
  })

  const submissions = useMemo(() => submissionsResult?.items ?? [], [submissionsResult])
  const totalSubmissions = submissionsResult?.total ?? 0
  const totalSubmissionPages = Math.ceil(totalSubmissions / itemsPerPage)

  const {
    data: allCertificatesResult,
    isLoading: isLoadingCerts,
    refetch: refetchCerts,
  } = useCertificatesByEvent(selectedEventId, { page: 1, limit: 10000, enabled: !!selectedEventId })

  const certificates = useMemo(() => allCertificatesResult?.items ?? [], [allCertificatesResult])

  useEffect(() => {
    if (!autoRefreshEnabled || !selectedEventId) return
    const interval = setInterval(() => {
      refetchCerts()
    }, 10000)
    return () => clearInterval(interval)
  }, [autoRefreshEnabled, selectedEventId, refetchCerts])

  const issueSingle = useIssueCertificate(selectedEventId)
  const issueBulk = useIssueCertificateBulk(selectedEventId)

  const certBySubmissionId = useMemo(
    () => new Map(certificates.map((c) => [c.submissionId, c])),
    [certificates]
  )

  const eligibleSubmissions = useMemo(() => submissions, [submissions])

  const issuedCount = useMemo(() => certificates.filter((c) => c.status === "GENERATED").length, [certificates])

  const pendingCount = useMemo(
    () => certificates.filter((c) => c.status === "QUEUED" || c.status === "PROCESSING").length,
    [certificates]
  )

  const failedCount = useMemo(() => certificates.filter((c) => c.status === "FAILED").length, [certificates])

  const unissuedCount = useMemo(
    () => Math.max(0, totalSubmissions - certificates.length),
    [totalSubmissions, certificates.length]
  )

  const isLoading = isLoadingSubmissions || isLoadingCerts

  const submissionIdMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const s of eligibleSubmissions) {
      if (s.contact?.id) map[s.contact.id] = s.id
    }
    return map
  }, [eligibleSubmissions])

  const eligibleContacts = useMemo(
    () =>
      eligibleSubmissions
        .filter((s) => !!s.contact)
        .map((s) => ({
          id: s.contact!.id,
          name: s.contact!.name || "Unnamed",
          email: s.contact!.email,
        })),
    [eligibleSubmissions]
  )

  function handleIssueOne(submissionId: string) {
    setIssuingId(submissionId)
    issueSingle.mutate(submissionId, {
      onSuccess: () => {
        toast.success("Certificate queued for generation.")
        setIssuingId(null)
      },
      onError: (err: Error) => {
        toast.error(err.message || "Failed to issue certificate.")
        setIssuingId(null)
      },
    })
  }

  async function handleIssueAll() {
    setIssueAllModalOpen(true)
    setFetchingUnissued(true)
    try {
      const totalPages = Math.ceil(totalSubmissions / itemsPerPage)
      const pagePromises = Array.from({ length: totalPages }, (_, i) => i + 1).map(page =>
        getSubmissionsByEvent(selectedEventId, {
          limit: itemsPerPage,
          offset: (page - 1) * itemsPerPage,
          status: "SUBMITTED"
        })
      )
      const results = await Promise.all(pagePromises)
      const allSubs = results.flatMap(result => result.items)
      const unissuedIds = allSubs
        .filter((s) => !certBySubmissionId.has(s.id) || certBySubmissionId.get(s.id)?.status === "FAILED")
        .map((s) => s.id)
      setUnissuedSubmissionIds(unissuedIds)
      setFetchingUnissued(false)
    } catch (error) {
      toast.error("Failed to fetch unissued submissions.")
      setFetchingUnissued(false)
      setIssueAllModalOpen(false)
    }
  }

  function confirmIssueAll() {
    if (unissuedSubmissionIds.length === 0) return
    issueBulk.mutate(unissuedSubmissionIds, {
      onSuccess: (result) => {
        toast(`${result.summary.queued} certificate(s) queued, ${result.summary.failed} failed.`)
        setIssueAllModalOpen(false)
        setUnissuedSubmissionIds([])
        refetchCerts()
      },
      onError: (err: Error) => toast.error(err.message || "Bulk issue failed."),
    })
  }

  return (
    <div className="space-y-6">
      {/* Event selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Event</CardTitle>
          <CardDescription>Choose an event to view and manage its certificates</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3 flex-wrap">
          {isLoadingEvents ? (
            <div className="h-10 w-64 bg-muted animate-pulse rounded-md" />
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-64 justify-between">
                  <span className="truncate">{selectedEvent ? selectedEvent.title : "Choose an event…"}</span>
                  <ChevronDown className="h-4 w-4 ml-2 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 max-h-60 overflow-y-auto">
                {events.length === 0 ? (
                  <DropdownMenuItem disabled>No events found</DropdownMenuItem>
                ) : (
                  events.map((event) => (
                    <DropdownMenuItem key={event.id} onSelect={() => setSelectedEventId(event.id)}>
                      {event.title}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {selectedEventId && (
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                variant={autoRefreshEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setAutoRefreshEnabled(!autoRefreshEnabled)
                  refetchCerts()
                }}
                disabled={isLoadingCerts}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingCerts ? "animate-spin" : ""}`} />
                {autoRefreshEnabled ? "Auto-Refresh On" : "Refresh"}
              </Button>
              <IssueCertificateDialog
                defaultEventId={selectedEventId}
                defaultEventLabel={selectedEvent?.title}
                eligibleContacts={eligibleContacts}
                submissionIdByContactId={submissionIdMap}
                onSuccess={() => refetchCerts()}
                trigger={
                  <Button size="sm" variant="outline">
                    <Award className="h-4 w-4 mr-2" />
                    Issue for Submission
                  </Button>
                }
              />
              {unissuedCount > 0 && (
                <Button onClick={handleIssueAll} disabled={issueBulk.isPending} size="sm">
                  {issueBulk.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Issue All ({unissuedCount})
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {!selectedEventId && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <Award className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No event selected</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Pick an event above to view its certificate status</p>
        </div>
      )}

      {selectedEventId && (
        <>
          {isLoading ? (
            <div className="h-12 bg-muted animate-pulse rounded-xl" />
          ) : (
            <Card>
              <CardContent className="py-3 px-4 flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Eligible Submissions</span>
                  <span className="text-lg font-bold">{totalSubmissions}</span>
                </div>
                <div className="h-6 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-green-600">{issuedCount}</span>
                  <span className="text-sm text-muted-foreground">Issued</span>
                </div>
                <div className="h-6 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-blue-500">{pendingCount}</span>
                  <span className="text-sm text-muted-foreground">Pending</span>
                </div>
                <div className="h-6 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-red-600">{failedCount}</span>
                  <span className="text-sm text-muted-foreground">Failed</span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Participant Certificates</CardTitle>
              <CardDescription>
                {selectedEvent?.title} — {totalSubmissions} eligible submission{totalSubmissions !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />
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
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Participant</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Issued At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eligibleSubmissions.map((submission, index) => {
                      const cert = certBySubmissionId.get(submission.id)
                      const contactName = submission.contact?.name ?? cert?.contact?.name ?? "—"
                      const contactEmail = submission.contact?.email ?? cert?.contact?.email ?? "—"
                      const rowNumber = (submissionsPage - 1) * itemsPerPage + index + 1
                      return (
                        <TableRow key={submission.id}>
                          <TableCell className="text-muted-foreground text-sm font-medium">{rowNumber}</TableCell>
                          <TableCell className="font-medium">{contactName}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{contactEmail}</TableCell>
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
                            {cert?.issuedAt ? format(new Date(cert.issuedAt), "MMM dd, yyyy") : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {cert?.status === "GENERATED" && cert.fileUrl && (
                                <Button variant="outline" size="sm" asChild>
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
                                  onSuccess={() => toast.success("Certificate notification queued.")}
                                />
                              )}
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
            {!isLoading && totalSubmissions > 0 && totalSubmissionPages > 1 && (
              <div className="border-t p-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {(submissionsPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(submissionsPage * itemsPerPage, totalSubmissions)} of {totalSubmissions} participants
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={submissionsPage === 1}
                    onClick={() => setSubmissionsPage((prev) => Math.max(1, prev - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalSubmissionPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={page === submissionsPage ? "default" : "outline"}
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setSubmissionsPage(page)}
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={submissionsPage === totalSubmissionPages}
                    onClick={() => setSubmissionsPage((prev) => Math.min(totalSubmissionPages, prev + 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      <Dialog open={issueAllModalOpen} onOpenChange={setIssueAllModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue All Certificates</DialogTitle>
            <DialogDescription>
              This will queue certificates for all {unissuedCount} unissued submissions in {selectedEvent?.title}.
            </DialogDescription>
          </DialogHeader>
          {fetchingUnissued ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Fetching unissued submissions...
            </div>
          ) : (
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Ready to issue {unissuedSubmissionIds.length} certificates.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueAllModalOpen(false)} disabled={issueBulk.isPending}>
              Cancel
            </Button>
            <Button
              onClick={confirmIssueAll}
              disabled={fetchingUnissued || unissuedSubmissionIds.length === 0 || issueBulk.isPending}
            >
              {issueBulk.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Issuing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Issue All ({unissuedSubmissionIds.length})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
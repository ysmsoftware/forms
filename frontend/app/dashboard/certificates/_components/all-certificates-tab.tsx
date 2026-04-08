"use client"

import React, { useState, useMemo } from "react"
import {
  Award, Download, RefreshCw, MessageSquare, Search, X,
  Filter, ChevronLeft, ChevronRight, CheckCircle2, Clock,
  Loader2, XCircle, ChevronDown,
} from "lucide-react"
import { SendCertificateDialog } from "@/components/send-certificate-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { toast } from "sonner"
import { useEvents } from "@/lib/query/hooks/useEvents"
import { useAllCertificates } from "@/lib/query/hooks/useCertificate"
import type { CertificateStatus, CertificateTemplateType, CertificateFilters } from "@/lib/api/certificate"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 25

const STATUS_CONFIG: Record<CertificateStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  GENERATED:  { label: "Generated",  variant: "default" },
  QUEUED:     { label: "Queued",     variant: "secondary" },
  PROCESSING: { label: "Processing", variant: "secondary" },
  FAILED:     { label: "Failed",     variant: "destructive" },
}

const TEMPLATE_LABELS: Record<CertificateTemplateType, string> = {
  ACHIEVEMENT: "Achievement",
  APPOINTMENT: "Appointment",
  COMPLETION:  "Completion",
  INTERNSHIP:  "Internship",
  WORKSHOP:    "Participation",
}

function StatusBadge({ status }: { status: CertificateStatus }) {
  const cfg = STATUS_CONFIG[status]
  const icon = {
    GENERATED:  <CheckCircle2 className="h-3 w-3" />,
    QUEUED:     <Clock className="h-3 w-3" />,
    PROCESSING: <Loader2 className="h-3 w-3 animate-spin" />,
    FAILED:     <XCircle className="h-3 w-3" />,
  }[status]
  return <Badge variant={cfg.variant} className="flex items-center gap-1 w-fit">{icon}{cfg.label}</Badge>
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Badge variant="secondary" className="flex items-center gap-1 h-6 pr-1">
      {label}
      <button onClick={onRemove} className="ml-1 rounded-sm hover:bg-muted p-0.5">
        <X className="h-3 w-3" />
      </button>
    </Badge>
  )
}

export function AllCertificatesTab() {
  const [eventId,       setEventId]       = useState("")
  const [status,        setStatus]        = useState<CertificateStatus | "">("")
  const [templateType,  setTemplateType]  = useState<CertificateTemplateType | "">("")
  const [contactInput,  setContactInput]  = useState("")
  const [contactName,   setContactName]   = useState("")
  const [dateFrom,      setDateFrom]      = useState<Date | undefined>()
  const [dateTo,        setDateTo]        = useState<Date | undefined>()
  const [page,          setPage]          = useState(1)
  const [showFilters,   setShowFilters]   = useState(false)
  const [eventPopover,  setEventPopover]  = useState(false)
  const [dateFromOpen,  setDateFromOpen]  = useState(false)
  const [dateToOpen,    setDateToOpen]    = useState(false)

  const { data: events = [], isLoading: isLoadingEvents } = useEvents()

  const selectedEventLabel = useMemo(
    () => events.find((e) => e.id === eventId)?.title ?? "",
    [events, eventId]
  )

  const filters: CertificateFilters = useMemo(() => ({
    ...(eventId      && { eventId }),
    ...(status       && { status: status as CertificateStatus }),
    ...(templateType && { templateType: templateType as CertificateTemplateType }),
    ...(contactName  && { contactName }),
    ...(dateFrom     && { dateFrom: dateFrom.toISOString() }),
    ...(dateTo       && { dateTo: new Date(new Date(dateTo).setHours(23, 59, 59, 999)).toISOString() }),
    page,
    limit: PAGE_SIZE,
  }), [eventId, status, templateType, contactName, dateFrom, dateTo, page])

  const { data, isLoading, isFetching, refetch } = useAllCertificates(filters)

  const certificates = data?.items      ?? []
  const totalItems   = data?.total      ?? 0
  const totalPages   = data?.totalPages ?? 1

  const activeFilterCount = [eventId, status, templateType, contactName, dateFrom, dateTo].filter(Boolean).length

  function resetFilters() {
    setEventId(""); setStatus(""); setTemplateType("")
    setContactName(""); setContactInput("")
    setDateFrom(undefined); setDateTo(undefined)
    setPage(1)
  }

  function applyContactSearch() {
    setContactName(contactInput.trim())
    setPage(1)
  }

  function setFilter<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setPage(1) }
  }

  return (
    <div className="space-y-4">

      {/* Filter bar */}
      <Card>
        <CardContent className="pt-4 pb-3 space-y-3">

          {/* Row 1: always-visible filters */}
          <div className="flex flex-wrap gap-2 items-center">

            {/* Contact search */}
            <div className="flex items-center gap-1 flex-1 min-w-[200px]">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8 h-9"
                  placeholder="Search by contact name..."
                  value={contactInput}
                  onChange={(e) => setContactInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyContactSearch()}
                />
              </div>
              <Button size="sm" variant="secondary" className="h-9" onClick={applyContactSearch}>Search</Button>
            </div>

            {/* Status */}
            <Select value={status || "__all__"} onValueChange={(v) => setFilter(setStatus)(v === "__all__" ? "" : v as CertificateStatus)}>
              <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Statuses</SelectItem>
                <SelectItem value="GENERATED">Generated</SelectItem>
                <SelectItem value="QUEUED">Queued</SelectItem>
                <SelectItem value="PROCESSING">Processing</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>

            {/* Template */}
            <Select value={templateType || "__all__"} onValueChange={(v) => setFilter(setTemplateType)(v === "__all__" ? "" : v as CertificateTemplateType)}>
              <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="All Templates" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Templates</SelectItem>
                <SelectItem value="ACHIEVEMENT">Achievement</SelectItem>
                <SelectItem value="APPOINTMENT">Appointment</SelectItem>
                <SelectItem value="COMPLETION">Completion</SelectItem>
                <SelectItem value="INTERNSHIP">Internship</SelectItem>
                <SelectItem value="WORKSHOP">Participation</SelectItem>
              </SelectContent>
            </Select>

            {/* More filters */}
            <Button variant={showFilters ? "secondary" : "outline"} size="sm" className="h-9" onClick={() => setShowFilters(v => !v)}>
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge className="ml-2 h-4 w-4 p-0 flex items-center justify-center text-[10px]">{activeFilterCount}</Badge>
              )}
            </Button>

            <Button variant="outline" size="sm" className="h-9" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
              Refresh
            </Button>

            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" className="h-9" onClick={resetFilters}>
                <X className="h-4 w-4 mr-1" />Clear all
              </Button>
            )}
          </div>

          {/* Row 2: expanded filters */}
          {showFilters && (
            <div className="flex flex-wrap gap-3 pt-2 border-t items-end">

              {/* Event */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Event</label>
                <Popover open={eventPopover} onOpenChange={setEventPopover}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-9 w-[220px] justify-between">
                      <span className="truncate text-sm">{eventId ? selectedEventLabel : "All Events"}</span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <div className="max-h-56 overflow-y-auto">
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                        onClick={() => { setFilter(setEventId)(""); setEventPopover(false) }}>
                        All Events
                      </button>
                      {isLoadingEvents
                        ? <div className="p-3 text-sm text-muted-foreground text-center">Loading...</div>
                        : events.map((ev) => (
                          <button key={ev.id}
                            className={cn("w-full text-left px-3 py-2 text-sm hover:bg-accent", ev.id === eventId && "bg-accent font-medium")}
                            onClick={() => { setFilter(setEventId)(ev.id); setEventPopover(false) }}>
                            {ev.title}
                          </button>
                        ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date From */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Issued From</label>
                <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-9 w-[145px] justify-start font-normal text-sm">
                      {dateFrom ? format(dateFrom, "MMM dd, yyyy") : <span className="text-muted-foreground">Pick date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateFrom}
                      onSelect={(d) => { setFilter(setDateFrom)(d); setDateFromOpen(false) }} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date To */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Issued To</label>
                <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-9 w-[145px] justify-start font-normal text-sm">
                      {dateTo ? format(dateTo, "MMM dd, yyyy") : <span className="text-muted-foreground">Pick date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateTo}
                      onSelect={(d) => { setFilter(setDateTo)(d); setDateToOpen(false) }}
                      disabled={(d) => !!dateFrom && d < dateFrom}
                      initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              {(dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" className="h-9"
                  onClick={() => { setDateFrom(undefined); setDateTo(undefined); setPage(1) }}>
                  <X className="h-4 w-4 mr-1" />Clear dates
                </Button>
              )}
            </div>
          )}

          {/* Active chips */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {contactName  && <FilterChip label={`Name: "${contactName}"`} onRemove={() => { setContactName(""); setContactInput(""); setPage(1) }} />}
              {status       && <FilterChip label={`Status: ${STATUS_CONFIG[status as CertificateStatus]?.label}`} onRemove={() => { setStatus(""); setPage(1) }} />}
              {templateType && <FilterChip label={`Template: ${TEMPLATE_LABELS[templateType as CertificateTemplateType]}`} onRemove={() => { setTemplateType(""); setPage(1) }} />}
              {eventId      && <FilterChip label={`Event: ${selectedEventLabel}`} onRemove={() => { setEventId(""); setPage(1) }} />}
              {dateFrom     && <FilterChip label={`From: ${format(dateFrom, "MMM dd, yyyy")}`} onRemove={() => { setDateFrom(undefined); setPage(1) }} />}
              {dateTo       && <FilterChip label={`To: ${format(dateTo, "MMM dd, yyyy")}`} onRemove={() => { setDateTo(undefined); setPage(1) }} />}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Result count */}
      {!isLoading && (
        <div className="flex items-center gap-3 px-1 text-sm text-muted-foreground flex-wrap">
          <span><span className="font-semibold text-foreground">{totalItems}</span> certificate{totalItems !== 1 ? "s" : ""} found</span>
          {isFetching && <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Refreshing...</span>}
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : certificates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Award className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No certificates found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {activeFilterCount > 0 ? "Try adjusting or clearing your filters" : "Issue your first certificate using the button above"}
              </p>
              {activeFilterCount > 0 && (
                <Button variant="outline" size="sm" className="mt-4" onClick={resetFilters}>Clear all filters</Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certificates.map((cert) => (
                  <TableRow key={cert.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{cert.contact?.name ?? "—"}</span>
                        <span className="text-xs text-muted-foreground">{cert.contact?.email ?? ""}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {cert.event?.title ?? <span className="italic text-xs">Direct issue</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-normal">
                        {TEMPLATE_LABELS[cert.templateType] ?? cert.templateType}
                      </Badge>
                    </TableCell>
                    <TableCell><StatusBadge status={cert.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {cert.issuedAt ? format(new Date(cert.issuedAt), "MMM dd, yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {cert.status === "GENERATED" && cert.fileUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={cert.fileUrl} target="_blank" rel="noopener noreferrer" download={cert.fileName ?? undefined}>
                              <Download className="h-4 w-4 mr-1" />Download
                            </a>
                          </Button>
                        )}
                        {cert.status === "GENERATED" && cert.contact?.id && (
                          <SendCertificateDialog
                            contactId={cert.contact.id}
                            contactName={cert.contact.name ?? ""}
                            eventId={cert.event?.id ?? ""}
                            eventTitle={cert.event?.title ?? "Direct issue"}
                            certificateFileUrl={cert.fileUrl ?? ""}
                            trigger={<Button variant="ghost" size="sm"><MessageSquare className="h-4 w-4 mr-1" />Send</Button>}
                            onSuccess={() => toast.success("Certificate notification queued.")}
                          />
                        )}
                        {(cert.status === "QUEUED" || cert.status === "PROCESSING") && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />Processing
                          </span>
                        )}
                        {cert.status === "FAILED" && (
                          <span className="text-xs text-destructive font-medium">Failed</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages} ({totalItems} total)</p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1 || isFetching} onClick={() => setPage(p => Math.max(1, p - 1))}>
              <ChevronLeft className="h-4 w-4" />Previous
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...")
                acc.push(p); return acc
              }, [])
              .map((p, i) => p === "..."
                ? <span key={`el-${i}`} className="px-2 text-muted-foreground">…</span>
                : <Button key={p} variant={p === page ? "default" : "outline"} size="sm" className="h-8 w-8 p-0"
                    disabled={isFetching} onClick={() => setPage(p as number)}>{p}</Button>
              )}
            <Button variant="outline" size="sm" disabled={page >= totalPages || isFetching} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
              Next<ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

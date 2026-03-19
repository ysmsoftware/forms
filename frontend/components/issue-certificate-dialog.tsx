"use client"

import React, { useState, useMemo, useEffect, type ReactNode } from "react"
import { useIssueCertificate } from "@/lib/query/hooks/useCertificate"
import { useEvents } from "@/lib/query/hooks/useEvents"
import { useContacts } from "@/lib/query/hooks/useContacts"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { Award, RefreshCw, Check, ChevronsUpDown, Search } from "lucide-react"

export interface IssueCertificateDialogProps {
    /** Pre-select an event in the Event combobox and lock it */
    defaultEventId?: string
    /** Label to show for the pre-selected event */
    defaultEventLabel?: string
    /** Open in single or bulk mode */
    defaultMode?: "single" | "bulk"
    /** Pre-populate the bulk selection with these contactIds */
    preSelectedContactIds?: string[]
    /** Map contactId → submissionId (critical for issuing) */
    submissionIdByContactId?: Record<string, string>
    /** List of contacts eligible to receive a certificate (those who submitted) */
    eligibleContacts?: { id: string; name: string; email?: string }[]
    /** Custom trigger element. Defaults to an "Issue Certificate" button */
    trigger?: React.ReactNode
    /** Called after a successful issue (single or bulk completion) */
    onSuccess?: () => void
}

export function IssueCertificateDialog({
    defaultEventId,
    defaultEventLabel,
    defaultMode,
    preSelectedContactIds,
    submissionIdByContactId,
    eligibleContacts = [],
    trigger,
    onSuccess,
}: IssueCertificateDialogProps) {

    const [open, setOpen] = useState(false)
    const [mode, setMode] = useState<"single" | "bulk">(defaultMode ?? "single")
    const [contactId, setContactId] = useState("")
    const [selectedContacts, setSelectedContacts] = useState<string[]>(preSelectedContactIds ?? [])
    const [eventId, setEventId] = useState(defaultEventId || "")
    const [selectedEventLabel, setSelectedEventLabel] = useState(defaultEventLabel || "")
    const [eventSearchOpen, setEventSearchOpen] = useState(false)
    const [bulkSearch, setBulkSearch] = useState("")
    const [bulkProgress, setBulkProgress] = useState<{ issued: number; total: number } | null>(null)

    // ── Data hooks ──────────────────────────────────────────────────────────
    const { data: events = [], isLoading: isLoadingEvents } = useEvents()

    const bulkFilteredContacts = useMemo(() => {
        if (!bulkSearch) return eligibleContacts
        const s = bulkSearch.toLowerCase()
        return eligibleContacts.filter((c: any) =>
            (c.name && c.name.toLowerCase().includes(s)) ||
            (c.email && c.email.toLowerCase().includes(s))
        )
    }, [eligibleContacts, bulkSearch])

    const issueSingle = useIssueCertificate(eventId)

    // ── Sync defaults ───────────────────────────────────────────────────────
    useEffect(() => {
        if (defaultEventId) {
            setEventId(defaultEventId)
            setSelectedEventLabel(defaultEventLabel ?? defaultEventId)
        }
    }, [defaultEventId, defaultEventLabel])

    useEffect(() => {
        if (open && preSelectedContactIds && preSelectedContactIds.length > 0) {
            setSelectedContacts(preSelectedContactIds)
            setMode("bulk")
        }
    }, [open, preSelectedContactIds])

    // ── Core logic ──────────────────────────────────────────────────────────
    async function handleIssue() {
        if (mode === "single") {
            const submissionId = submissionIdByContactId?.[contactId]
            if (!submissionId) {
                toast.error("No submission found for this contact.")
                return
            }
            issueSingle.mutate(submissionId, {
                onSuccess: () => {
                    const c = eligibleContacts.find(c => c.id === contactId)
                    toast.success(`Certificate queued for ${c?.name || "contact"}.`)
                    setOpen(false)
                    onSuccess?.()
                },
                onError: (err: Error) => {
                    toast.error(err.message || "Failed to issue certificate.")
                },
            })
        } else {
            // Bulk: loop sequentially
            const contactsWithSubmissions = selectedContacts.filter(cId => !!submissionIdByContactId?.[cId])
            const results: { contactId: string; success: boolean; error?: string }[] = []
            setBulkProgress({ issued: 0, total: contactsWithSubmissions.length })

            for (let i = 0; i < contactsWithSubmissions.length; i++) {
                const cId = contactsWithSubmissions[i]
                const submissionId = submissionIdByContactId![cId]
                try {
                    await issueSingle.mutateAsync(submissionId)
                    results.push({ contactId: cId, success: true })
                } catch (err: any) {
                    results.push({ contactId: cId, success: false, error: err.message })
                }
                setBulkProgress({ issued: i + 1, total: contactsWithSubmissions.length })
            }

            setBulkProgress(null)
            setOpen(false)
            setSelectedContacts([])

            const successCount = results.filter(r => r.success).length
            const failCount = results.filter(r => !r.success).length
            if (failCount === 0) {
                toast(`${successCount} certificate(s) queued.`)
                onSuccess?.()
            } else {
                toast.error(`${successCount} queued, ${failCount} failed.`)
                if (successCount > 0) onSuccess?.()
            }
        }
    }

    // ── Disabled logic ──────────────────────────────────────────────────────
    const issueDisabled =
        (mode === "single" && (!contactId || !submissionIdByContactId?.[contactId])) ||
        (mode === "bulk" && selectedContacts.filter(cId => !!submissionIdByContactId?.[cId]).length === 0) ||
        issueSingle.isPending ||
        bulkProgress !== null

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val)
            if (!val) {
                if (!defaultEventId) {
                    setEventId("")
                    setSelectedEventLabel("")
                }
                setSelectedContacts(preSelectedContactIds ?? [])
                setBulkSearch("")
                if (!defaultMode) setMode("single")
                setBulkProgress(null)
                issueSingle.reset()
            }
        }}>
            <DialogTrigger asChild>
                {trigger ?? (
                    <Button><Award className="h-4 w-4 mr-2" />Issue Certificate</Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Issue Certificate</DialogTitle>
                    <DialogDescription>Issue a certificate to a contact based on their event submission</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 max-h-[70vh] overflow-y-auto overflow-x-hidden p-1">
                    {/* Left Column - Settings */}
                    <div className="space-y-4 md:border-r md:pr-6">
                        <h3 className="font-semibold text-sm mb-3">Certificate Settings</h3>

                        {/* Toggle Mode */}
                        <div className="flex gap-2 mb-4 p-1 bg-muted rounded-lg w-max">
                            <Button variant={mode === "single" ? "secondary" : "ghost"} size="sm" onClick={() => setMode("single")}>Single</Button>
                            <Button variant={mode === "bulk" ? "secondary" : "ghost"} size="sm" onClick={() => setMode("bulk")}>Bulk</Button>
                        </div>

                        {/* Event combobox */}
                        <div className="space-y-2 flex flex-col">
                            <label className="text-sm font-medium">Event</label>
                            {defaultEventId ? (
                                <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/50 text-sm">
                                    <span className="truncate flex-1">{selectedEventLabel}</span>
                                    <Badge variant="secondary" className="text-[10px] shrink-0">Locked</Badge>
                                </div>
                            ) : (
                                <Popover open={eventSearchOpen} onOpenChange={setEventSearchOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" aria-expanded={eventSearchOpen} className="w-full justify-between overflow-hidden">
                                            <span className="truncate">{eventId ? selectedEventLabel : "Search event..."}</span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search event..." />
                                            <CommandList>
                                                <CommandEmpty>No event found.</CommandEmpty>
                                                <CommandGroup>
                                                    {isLoadingEvents ? (
                                                        <div className="p-4 text-sm text-center text-muted-foreground">Loading events...</div>
                                                    ) : (
                                                        events.map((ev) => (
                                                            <CommandItem key={ev.id} onSelect={() => {
                                                                setEventId(ev.id)
                                                                setSelectedEventLabel(ev.title)
                                                                setEventSearchOpen(false)
                                                            }}>
                                                                <Check className={cn("mr-2 h-4 w-4", eventId === ev.id ? "opacity-100" : "opacity-0")} />
                                                                <div className="flex flex-1 items-center justify-between overflow-hidden gap-2">
                                                                    <span className="truncate">{ev.title}</span>
                                                                    <Badge variant="secondary" className="flex-shrink-0 text-[10px]">{ev.status}</Badge>
                                                                </div>
                                                            </CommandItem>
                                                        ))
                                                    )}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            )}
                        </div>

                        {/* Info note */}
                        <div className="rounded-md border bg-muted/30 p-3">
                            <p className="text-xs text-muted-foreground">
                                Certificates are issued per submission. Only contacts with a completed submission can receive one.
                            </p>
                        </div>
                    </div>

                    {/* Right Column - Recipients */}
                    <div className="space-y-4">
                        {mode === "single" ? (
                            <>
                                <h3 className="font-semibold text-sm mb-3">Recipient</h3>
                                <div className="space-y-2 flex flex-col">
                                    <label className="text-sm font-medium">Contact</label>
                                    <Select value={contactId} onValueChange={setContactId}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select a contact" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {eligibleContacts.length === 0 ? (
                                                <div className="p-2 text-sm text-center text-muted-foreground">No eligible submissions</div>
                                            ) : (
                                                eligibleContacts.map((c) => (
                                                    <SelectItem key={c.id} value={c.id}>
                                                        <div className="flex flex-col text-left">
                                                            <span className="font-medium">{c.name || "Unnamed"}</span>
                                                            <span className="text-xs text-muted-foreground">{c.email}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {/* Single Contact Preview Card */}
                                {contactId && (() => {
                                    const c = eligibleContacts.find(x => x.id === contactId)
                                    if (!c) return null
                                    return (
                                        <div className="flex items-center gap-4 mt-4 p-4 border rounded-lg bg-muted/20">
                                            <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                                {(c.name?.charAt(0) || "?").toUpperCase()}
                                            </div>
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="font-bold truncate">{c.name || "Unnamed"}</span>
                                                <span className="text-xs text-muted-foreground truncate">
                                                    {c.email || "—"}
                                                </span>
                                            </div>
                                            <Badge variant="secondary" className="ml-auto text-[10px] shrink-0">Eligible</Badge>
                                        </div>
                                    )
                                })()}
                            </>
                        ) : (
                            <div className="flex flex-col h-full">
                                <h3 className="font-semibold text-sm mb-3">Recipients ({selectedContacts.filter(cId => !!submissionIdByContactId?.[cId]).length} eligible selected)</h3>
                                <Input placeholder="Filter contacts..." value={bulkSearch} onChange={(e) => setBulkSearch(e.target.value)} />
                                <div className="flex items-center justify-between mt-2">
                                    <Button variant="ghost" size="sm" className="h-8 text-xs px-2" onClick={() => {
                                        const eligibleIds = bulkFilteredContacts
                                            .filter((c: any) => !!submissionIdByContactId?.[c.id])
                                            .map((c: any) => c.id)
                                        setSelectedContacts(eligibleIds)
                                    }}>Select All Eligible</Button>
                                    <Button variant="ghost" size="sm" className="h-8 text-xs px-2" onClick={() => setSelectedContacts([])}>Deselect All</Button>
                                </div>
                                <div className="max-h-64 overflow-y-auto border rounded-md mt-2 flex-1">
                                    {bulkFilteredContacts.length === 0 && (
                                        <div className="p-4 text-center text-sm text-muted-foreground">No eligible contacts found...</div>
                                    )}
                                    {bulkFilteredContacts.map((c: any) => {
                                        const hasSubmission = !!submissionIdByContactId?.[c.id]
                                        return (
                                            <div
                                                key={c.id}
                                                className={cn(
                                                    "flex items-center gap-3 px-3 py-2 border-b last:border-0",
                                                    hasSubmission
                                                        ? "hover:bg-accent cursor-pointer"
                                                        : "opacity-50 cursor-not-allowed"
                                                )}
                                                onClick={() => {
                                                    if (!hasSubmission) return
                                                    setSelectedContacts(prev =>
                                                        prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]
                                                    )
                                                }}
                                            >
                                                <Checkbox
                                                    checked={selectedContacts.includes(c.id)}
                                                    disabled={!hasSubmission}
                                                    onCheckedChange={(checked) => {
                                                        if (!hasSubmission) return
                                                        if (checked) setSelectedContacts(prev => [...prev, c.id])
                                                        else setSelectedContacts(prev => prev.filter(id => id !== c.id))
                                                    }}
                                                />
                                                <div className="flex flex-col flex-1 overflow-hidden">
                                                    <span className="font-bold text-sm truncate">{c.name || "Unnamed"}</span>
                                                    <span className="text-xs text-muted-foreground truncate">{c.email}</span>
                                                </div>
                                                {!hasSubmission && (
                                                    <span className="text-[10px] text-muted-foreground shrink-0">No submission</span>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t pt-4 mt-2 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex-1 flex flex-col justify-center w-full">
                        {bulkProgress !== null ? (
                            <div className="w-full max-w-sm space-y-1">
                                <div className="text-sm font-medium">Issuing... {bulkProgress.issued}/{bulkProgress.total}</div>
                                <Progress value={(bulkProgress.issued / bulkProgress.total) * 100} className="h-2" />
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground">
                                {mode === "single" ? (
                                    contactId
                                        ? submissionIdByContactId?.[contactId]
                                            ? "Ready to issue"
                                            : "No submission for this contact"
                                        : "No contact selected"
                                ) : (
                                    `Issuing to ${selectedContacts.filter(cId => !!submissionIdByContactId?.[cId]).length} contact(s)`
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={bulkProgress !== null || issueSingle.isPending}>Cancel</Button>
                        <Button
                            disabled={issueDisabled}
                            onClick={handleIssue}
                            className="w-full md:w-auto min-w-[140px]"
                        >
                            {(issueSingle.isPending || bulkProgress !== null) ? (
                                <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Issuing...</>
                            ) : (
                                <><Award className="mr-2 h-4 w-4" />{mode === "single" ? "Issue Certificate" : `Issue to ${selectedContacts.filter(cId => !!submissionIdByContactId?.[cId]).length} Contacts`}</>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

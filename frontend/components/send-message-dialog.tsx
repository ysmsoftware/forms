"use client"

import { useState, useMemo, useEffect } from "react"
import { useSendMessage, useResolveParams } from "@/lib/query/hooks/useMessages"
import { useEvents } from "@/lib/query/hooks/useEvents"
import { useContacts } from "@/lib/query/hooks/useContacts"
import { type MessageType, type MessageTemplate, resolveMessageParams, type ResolveParamsInput, type ResolveParamsResult } from "@/lib/api/messages"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { Send, RefreshCw, Check, ChevronsUpDown } from "lucide-react"

export interface SendMessageDialogProps {
    /** Pre-select an event in the Event combobox and lock it */
    defaultEventId?: string
    /** Label to show for the pre-selected event */
    defaultEventLabel?: string
    /** Open in bulk mode by default */
    defaultMode?: "single" | "bulk"
    /** Pre-populate the bulk selection with these contactIds */
    preSelectedContactIds?: string[]
    /** Custom trigger element. Defaults to a "Send Message" button */
    trigger?: React.ReactNode
    /** Called after a successful send (single or bulk completion) */
    onSuccess?: () => void
}

const TEMPLATES: { value: MessageTemplate; label: string }[] = [
    { value: "OTP_VERIFICATION_CODE", label: "Otp Verification Code" },
    { value: "YSM_ONBOARDING_MESSAGE", label: "Ysm Onboarding Message" },
    { value: "BIRTHDAY_WISHES_YSM", label: "Birthday Wishes Ysm" },
    { value: "FEEDBACK_COLLECTION_MESSAGE", label: "Feedback Collection Message" },
    { value: "THANK_YOU_FOR_ATTENDING_WORKSHOP", label: "Thank You For Attending Workshop" },
    { value: "CERTIFICATE_ISSUED", label: "Certificate Issued" },
    { value: "WORKSHOP_OR_INTERNSHIP_COMPLETION_MESSAGE", label: "Workshop Or Internship Completion Message" },
    { value: "INTERNSHIP_REGISTRATION_CONFIRMATION", label: "Internship Registration Confirmation" },
    { value: "REGISTRATION_SUCCESSFUL", label: "Registration Successful" },
    { value: "WORKSHOP_REMINDER_MESSAGE", label: "Workshop Reminder Message" },
]

const TEMPLATE_DESCRIPTIONS: Record<MessageTemplate, string> = {
    OTP_VERIFICATION_CODE: "Send a one-time password to the contact",
    YSM_ONBOARDING_MESSAGE: "Welcome message for new contacts",
    BIRTHDAY_WISHES_YSM: "Birthday greeting from YSM",
    FEEDBACK_COLLECTION_MESSAGE: "Request feedback after an event",
    THANK_YOU_FOR_ATTENDING_WORKSHOP: "Thank the contact for attending",
    CERTIFICATE_ISSUED: "Notify that a certificate has been issued",
    WORKSHOP_OR_INTERNSHIP_COMPLETION_MESSAGE: "Completion message with certificate link",
    INTERNSHIP_REGISTRATION_CONFIRMATION: "Confirm internship registration details",
    REGISTRATION_SUCCESSFUL: "Confirm event registration with date & link",
    WORKSHOP_REMINDER_MESSAGE: "Reminder with event date, time & link",
}

const toTitleCase = (s: string) =>
    s.split("_").map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(" ")

export function SendMessageDialog({
    defaultEventId,
    defaultEventLabel,
    defaultMode,
    preSelectedContactIds,
    trigger,
    onSuccess
}: SendMessageDialogProps) {

    const [open, setOpen] = useState(false)
    const [contactId, setContactId] = useState("")
    const [eventId, setEventId] = useState(defaultEventId || "")
    const [msgType, setMsgType] = useState<MessageType>("WHATSAPP")
    const [template, setTemplate] = useState<MessageTemplate>("WORKSHOP_REMINDER_MESSAGE")

    const [paramOverrides, setParamOverrides] = useState<Record<string, string>>({})

    // Searchable Comboboxes State
    const [selectedContactLabel, setSelectedContactLabel] = useState("")
    const [selectedEventLabel, setSelectedEventLabel] = useState(defaultEventLabel || "")
    const [contactSearchOpen, setContactSearchOpen] = useState(false)
    const [contactSearch, setContactSearch] = useState("")
    // Store the full selected contact object so preview card never loses email/phone
    // after contactSearch is cleared and allContacts reverts to the unfiltered page
    const [selectedContact, setSelectedContact] = useState<{ id: string; name: string | null; email: string | null; phone: string | null } | null>(null)
    const [eventSearchOpen, setEventSearchOpen] = useState(false)

    // Bulk Sends State
    const [mode, setMode] = useState<"single" | "bulk">(defaultMode ?? "single")
    const [selectedContacts, setSelectedContacts] = useState<string[]>(preSelectedContactIds ?? [])
    const [bulkSearch, setBulkSearch] = useState("")
    const [bulkProgress, setBulkProgress] = useState<{ sent: number; total: number } | null>(null)

    const resolveInput = useMemo(() => {
        const representativeContactId = mode === "single" ? contactId : selectedContacts[0]
        if (!representativeContactId || !template) return null
        return {
            contactId: representativeContactId,
            eventId: eventId || undefined,
            template,
        }
    }, [mode, contactId, selectedContacts, eventId, template])

    const {
        data: resolvedData,
        isLoading: isResolvingParams,
        error: resolveError,
    } = useResolveParams(resolveInput)

    useEffect(() => {
        setParamOverrides({})
    }, [template, eventId])

    const hasUnfilledMissingParams = resolvedData
        ? resolvedData.missing.some(field => !paramOverrides[field]?.trim())
        : false

    const sendMessage = useSendMessage()
    const { data: eventsData = [], isLoading: isLoadingEvents } = useEvents()
    const { data: contactsData, isLoading: isLoadingContacts, fetchNextPage, hasNextPage } = useContacts(contactSearch)

    const allContacts = useMemo(() => {
        if (!contactsData) return []
        if ("pages" in (contactsData as any)) return (contactsData as any).pages.flatMap((p: any) => p.contacts || [])
        if ("contacts" in (contactsData as any)) return (contactsData as any).contacts
        return []
    }, [contactsData])

    const bulkFilteredContacts = useMemo(() => {
        if (!bulkSearch) return allContacts
        const s = bulkSearch.toLowerCase()
        return allContacts.filter((c: any) =>
            (c.name && c.name.toLowerCase().includes(s)) ||
            (c.email && c.email.toLowerCase().includes(s))
        )
    }, [allContacts, bulkSearch])

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

    const handleSend = async () => {
        if (mode === "single") {
            try {
                await sendMessage.mutateAsync({
                    contactId,
                    eventId: eventId || undefined,
                    type: msgType,
                    template,
                    ...(Object.keys(paramOverrides).length > 0 && { params: paramOverrides }),
                })
                toast.success(`Message queued for ${selectedContactLabel || "contact"}`)
                setOpen(false)
                onSuccess?.()
            } catch (err: any) {
                toast.error(err.message ?? "Something went wrong")
            }
        } else {
            const results: { contactId: string; success: boolean; error?: string }[] = []
            setBulkProgress({ sent: 0, total: selectedContacts.length })

            for (let i = 0; i < selectedContacts.length; i++) {
                const cId = selectedContacts[i]
                try {
                    await sendMessage.mutateAsync({
                        contactId: cId,
                        eventId: eventId || undefined,
                        type: msgType,
                        template,
                        ...(Object.keys(paramOverrides).length > 0 && { params: paramOverrides }),
                    })
                    results.push({ contactId: cId, success: true })
                } catch (err: any) {
                    results.push({ contactId: cId, success: false, error: err.message })
                }
                setBulkProgress({ sent: i + 1, total: selectedContacts.length })
            }

            setBulkProgress(null)
            setOpen(false)
            setSelectedContacts([])

            const successCount = results.filter(r => r.success).length
            const failCount = results.filter(r => !r.success).length

            if (failCount === 0) {
                toast.success(`${successCount} message${successCount !== 1 ? "s" : ""} sent successfully`)
                onSuccess?.()
            } else {
                const failedNames = results
                    .filter(r => !r.success)
                    .map(r => allContacts.find((c: any) => c.id === r.contactId)?.name ?? r.contactId)
                    .join(", ")
                toast.error(`${successCount} sent, ${failCount} failed: ${failedNames}`)
                if (successCount > 0) onSuccess?.()
            }
        }
    }

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val)
            if (!val) {
                setContactId("")
                setSelectedContact(null)
                if (!defaultEventId) {
                    setEventId("")
                    setSelectedEventLabel("")
                }
                setSelectedContactLabel("")
                setSelectedContacts(preSelectedContactIds ?? [])
                setBulkSearch("")
                setContactSearch("")
                if (!defaultMode) setMode("single")
                setBulkProgress(null)
                setParamOverrides({})
                sendMessage.reset()
            }
        }}>
            <DialogTrigger asChild>
                {trigger ?? (
                    <Button><Send className="h-4 w-4 mr-2" />Send Message</Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Send Message</DialogTitle>
                    <DialogDescription>Queue a message to a contact via WhatsApp or Email</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 max-h-[70vh] overflow-y-auto overflow-x-hidden p-1">
                    {/* Left Column - Configuration */}
                    <div className="space-y-4 md:border-r md:pr-6">
                        <h3 className="font-semibold text-sm mb-3">Message Settings</h3>

                        {/* Toggle Mode */}
                        <div className="flex gap-2 mb-4 p-1 bg-muted rounded-lg w-max">
                            <Button variant={mode === "single" ? "secondary" : "ghost"} size="sm" onClick={() => setMode("single")}>Single</Button>
                            <Button variant={mode === "bulk" ? "secondary" : "ghost"} size="sm" onClick={() => setMode("bulk")}>Bulk</Button>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Channel</label>
                            <Select value={msgType} onValueChange={(val) => setMsgType(val as MessageType)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select channel" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                                    <SelectItem value="EMAIL">Email</SelectItem>
                                    <SelectItem value="SMS">SMS</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 flex flex-col">
                            <label className="text-sm font-medium">Template</label>
                            <Select value={template} onValueChange={(val) => setTemplate(val as MessageTemplate)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select template" />
                                </SelectTrigger>
                                <SelectContent>
                                    {TEMPLATES.map(t => (
                                        <SelectItem key={t.value} value={t.value}>
                                            <div className="flex flex-col py-0.5">
                                                <span className="font-medium text-sm">{t.label}</span>
                                                <span className="text-xs text-muted-foreground line-clamp-1 max-w-[180px]">{TEMPLATE_DESCRIPTIONS[t.value]}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* ── Params Preview ─────────────────────── */}
                        {resolveInput !== null && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium">Message Parameters</label>
                                    {isResolvingParams && (
                                        <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                                    )}
                                </div>

                                {resolveError && (
                                    <p className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">
                                        Could not resolve params. Check contact and event selection.
                                    </p>
                                )}

                                {resolvedData && !isResolvingParams && (
                                    <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                                        {Object.entries(resolvedData.resolved).map(([key, value]) => (
                                            <div key={key} className="flex items-start gap-2 text-xs">
                                                <span className="text-muted-foreground capitalize min-w-[80px] shrink-0 pt-0.5">
                                                    {key}
                                                </span>
                                                <span className="text-foreground font-medium break-all">
                                                    {value || <span className="text-muted-foreground italic">empty</span>}
                                                </span>
                                            </div>
                                        ))}
                                        {resolvedData.missing.length > 0 && (
                                            <>
                                                <div className="border-t pt-2 mt-2">
                                                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
                                                        <span>⚠</span>
                                                        {resolvedData.missing.length} field{resolvedData.missing.length !== 1 ? "s" : ""} required
                                                    </p>
                                                    {resolvedData.missing.map((field) => (
                                                        <div key={field} className="space-y-1 mb-2">
                                                            <label className="text-xs font-medium capitalize text-muted-foreground">
                                                                {field}
                                                            </label>
                                                            <Input
                                                                className="h-7 text-xs"
                                                                placeholder={`Enter ${field}...`}
                                                                value={paramOverrides[field] ?? ""}
                                                                onChange={(e) =>
                                                                    setParamOverrides(prev => ({
                                                                        ...prev,
                                                                        [field]: e.target.value,
                                                                    }))
                                                                }
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                        {resolvedData.missing.length === 0 && (
                                            <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 pt-1 border-t">
                                                <Check className="h-3 w-3" />
                                                All params resolved automatically
                                            </p>
                                        )}

                                        {mode === "bulk" && selectedContacts.length > 1 && (
                                            <p className="text-[10px] text-muted-foreground mt-2 italic pt-2 border-t text-center">
                                                Parameters shown for first selected contact. Overrides apply to all.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-2 flex flex-col">
                            <label className="text-sm font-medium">Event ID (optional)</label>
                            {defaultEventId ? (
                                <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/50 text-sm">
                                    <span className="truncate flex-1">{selectedEventLabel}</span>
                                    <Badge variant="secondary" className="text-[10px] shrink-0">Locked</Badge>
                                </div>
                            ) : (
                                <Popover open={eventSearchOpen} onOpenChange={setEventSearchOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" aria-expanded={eventSearchOpen} className="w-full justify-between overflow-hidden">
                                            <span className="truncate">{eventId ? selectedEventLabel : "Search event... (optional)"}</span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search event..." />
                                            <CommandList>
                                                <CommandEmpty>No event found.</CommandEmpty>
                                                <CommandGroup>
                                                    <CommandItem onSelect={() => {
                                                        setEventId("")
                                                        setSelectedEventLabel("")
                                                        setEventSearchOpen(false)
                                                    }}>
                                                        <Check className={cn("mr-2 h-4 w-4", eventId === "" ? "opacity-100" : "opacity-0")} />
                                                        None (contact-only template)
                                                    </CommandItem>
                                                    {isLoadingEvents ? (
                                                        <div className="p-4 text-sm text-center text-muted-foreground">Loading events...</div>
                                                    ) : (
                                                        eventsData.map((ev) => (
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
                    </div>

                    {/* Right Column - Recipients */}
                    <div className="space-y-4">
                        {mode === "single" ? (
                            <>
                                <h3 className="font-semibold text-sm mb-3">Recipient</h3>
                                <div className="space-y-2 flex flex-col">
                                    <label className="text-sm font-medium">Contact</label>
                                    <div className="relative">
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            onClick={() => setContactSearchOpen(v => !v)}
                                            className="w-full justify-between overflow-hidden"
                                        >
                                            <span className="truncate">{contactId ? selectedContactLabel : "Search contact..."}</span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                        {contactSearchOpen && (
                                            <div className="absolute z-50 top-full mt-1 w-full rounded-md border bg-popover shadow-md">
                                                <div className="p-2 border-b">
                                                    <input
                                                        autoFocus
                                                        className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground px-1 py-0.5"
                                                        placeholder="Search by name or email..."
                                                        value={contactSearch}
                                                        onChange={e => setContactSearch(e.target.value)}
                                                    />
                                                </div>
                                                <div
                                                    className="overflow-y-scroll"
                                                    style={{ maxHeight: "240px" }}
                                                    onWheel={e => e.stopPropagation()}
                                                >
                                                    {isLoadingContacts ? (
                                                        <div className="p-4 text-sm text-center text-muted-foreground">Loading...</div>
                                                    ) : allContacts.length === 0 ? (
                                                        <div className="p-4 text-sm text-center text-muted-foreground">No contacts found.</div>
                                                    ) : (
                                                        allContacts.map((c: any) => (
                                                            <div
                                                                key={c.id}
                                                                className={cn(
                                                                    "flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-accent",
                                                                    contactId === c.id && "bg-accent"
                                                                )}
                                                                onClick={() => {
                                                                    setContactId(c.id)
                                                                    setSelectedContactLabel(c.name || c.email || "Unknown")
                                                                    setSelectedContact({ id: c.id, name: c.name, email: c.email, phone: c.phone })
                                                                    setContactSearchOpen(false)
                                                                    setContactSearch("")
                                                                }}
                                                            >
                                                                <Check className={cn("h-4 w-4 shrink-0", contactId === c.id ? "opacity-100" : "opacity-0")} />
                                                                <div className="flex flex-col overflow-hidden">
                                                                    <span className="font-medium text-sm truncate">{c.name || "Unnamed"}</span>
                                                                    <span className="text-xs text-muted-foreground truncate">{c.email}</span>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                    {hasNextPage && (
                                                        <div className="p-2 text-center border-t">
                                                            <Button variant="ghost" size="sm" className="text-xs w-full" onClick={() => fetchNextPage()}>
                                                                Load more
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {/* Close dropdown when clicking outside */}
                                    {contactSearchOpen && (
                                        <div className="fixed inset-0 z-40" onClick={() => { setContactSearchOpen(false); setContactSearch("") }} />
                                    )}
                                </div>
                                {/* Single Contact Preview Card */}
                                {contactId && selectedContact && (
                                    <div className="flex items-center gap-4 mt-4 p-4 border rounded-lg bg-muted/20">
                                        <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                            {(selectedContactLabel.charAt(0) || "?").toUpperCase()}
                                        </div>
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="font-bold truncate">{selectedContactLabel}</span>
                                            <span className="text-xs text-muted-foreground truncate">
                                                {selectedContact.email || "—"} • {selectedContact.phone || "—"}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col h-full">
                                <h3 className="font-semibold text-sm mb-3">Recipients ({selectedContacts.length} selected)</h3>
                                <Input placeholder="Filter contacts..." value={bulkSearch} onChange={(e) => setBulkSearch(e.target.value)} />
                                <div className="flex items-center justify-between mt-2">
                                    <Button variant="ghost" size="sm" className="h-8 text-xs px-2" onClick={() => setSelectedContacts(bulkFilteredContacts.map((c: any) => c.id))}>Select All</Button>
                                    <Button variant="ghost" size="sm" className="h-8 text-xs px-2" onClick={() => setSelectedContacts([])}>Deselect All</Button>
                                </div>
                                <div className="max-h-64 overflow-y-auto border rounded-md mt-2 flex-1">
                                    {isLoadingContacts && <div className="p-4 text-center text-sm text-muted-foreground">Loading contacts...</div>}
                                    {(!isLoadingContacts && bulkFilteredContacts.length === 0) && (
                                        <div className="p-4 text-center text-sm text-muted-foreground">No matching contacts...</div>
                                    )}
                                    {bulkFilteredContacts.map((c: any) => (
                                        <div key={c.id} className="flex items-center gap-3 px-3 py-2 hover:bg-accent cursor-pointer border-b last:border-0" onClick={() => {
                                            setSelectedContacts(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id])
                                        }}>
                                            <Checkbox checked={selectedContacts.includes(c.id)} onCheckedChange={(checked) => {
                                                if (checked) setSelectedContacts(prev => [...prev, c.id])
                                                else setSelectedContacts(prev => prev.filter(id => id !== c.id))
                                            }} />
                                            <div className="flex flex-col flex-1 overflow-hidden">
                                                <span className="font-bold text-sm truncate">{c.name || "Unnamed"}</span>
                                                <span className="text-xs text-muted-foreground truncate">{c.email}</span>
                                            </div>
                                        </div>
                                    ))}
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
                                <div className="text-sm font-medium">Sending... {bulkProgress.sent}/{bulkProgress.total}</div>
                                <Progress value={(bulkProgress.sent / bulkProgress.total) * 100} className="h-2" />
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground">
                                {mode === "single" ? (
                                    contactId ? `Sending to 1 contact` : "No contact selected"
                                ) : (
                                    `Sending to ${selectedContacts.length} contact(s)`
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={bulkProgress !== null || sendMessage.isPending}>Cancel</Button>
                        <Button
                            disabled={
                                (mode === "single" && !contactId) ||
                                (mode === "bulk" && selectedContacts.length === 0) ||
                                sendMessage.isPending ||
                                bulkProgress !== null ||
                                hasUnfilledMissingParams ||
                                isResolvingParams
                            }
                            onClick={handleSend}
                            className="w-full md:w-auto min-w-[140px]"
                        >
                            {(sendMessage.isPending || bulkProgress !== null) ? (
                                <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Sending...</>
                            ) : (
                                <><Send className="mr-2 h-4 w-4" />{mode === "single" ? "Send Message" : `Send to ${selectedContacts.length} Contacts`}</>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, MessageSquare, Send, Check, RefreshCw, AlertTriangle, Info } from "lucide-react"
import { bulkSendByEvent, type MessageType, type MessageTemplate } from "@/lib/api/messages"
import { useSubmissionsByEvent } from "@/lib/query/hooks/useSubmissions"
import { useResolveParams } from "@/lib/query/hooks/useMessages"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// ── Event Templates list ──────────────────────────────────────────────────

const TEMPLATES: { value: MessageTemplate; label: string }[] = [
    { value: "WORKSHOP_REMINDER_MESSAGE", label: "Workshop Reminder" },
    { value: "REGISTRATION_SUCCESSFUL", label: "Registration Successful" },
    { value: "FEEDBACK_COLLECTION_MESSAGE", label: "Feedback Collection" },
    { value: "THANK_YOU_FOR_ATTENDING_WORKSHOP", label: "Thank You for Attending" },
    { value: "CERTIFICATE_ISSUED", label: "Certificate Issued" },
    { value: "WORKSHOP_OR_INTERNSHIP_COMPLETION_MESSAGE", label: "Workshop / Internship Completion" },
    { value: "INTERNSHIP_REGISTRATION_CONFIRMATION", label: "Internship Registration Confirmation" },
    { value: "PAYMENT_CONFIRMATION_MESSAGE", label: "Payment Confirmation" },
]

// Helper to format WhatsApp markdown asterisks to HTML strong tags
function formatWhatsAppText(text: string): string {
    return text
        .replace(/\*(.*?)\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br />")
}

// Frontend Message Preview Engine
function getTemplatePreview(template: string, channel: string, params: Record<string, string>): { subject?: string; body: string } {
    // Find key helper to handle case-insensitivity robustly
    const getVal = (keyName: string, fallback: string) => {
        const foundKey = Object.keys(params).find(k => k.toLowerCase() === keyName.toLowerCase())
        const val = foundKey ? params[foundKey] : ""
        return val && val.trim() ? val : fallback
    }

    const name = getVal("name", "[Participant's Name]")
    const eventName = getVal("eventName", "[Event Name]")
    const date = getVal("date", "[Date]")
    const time = getVal("time", "[Time]")
    const link = getVal("link", "[Link]")
    const startDate = getVal("startDate", "[Start Date]")
    const mode = getVal("mode", "[Mode]")
    const reportingTime = getVal("reportingTime", "[Reporting Time]")
    const amount = getVal("amount", "[Amount]")

    switch (template) {
        case "WORKSHOP_REMINDER_MESSAGE":
            if (channel === "EMAIL") {
                return {
                    subject: `Reminder: ${eventName} is Coming Up!`,
                    body: `<p>Dear ${name},</p>
<p>This is a reminder for your registered program: <strong>${eventName}</strong></p>
<p>📅 <strong>Date:</strong> ${date}</p>
<p>⏰ <strong>Time:</strong> ${time}</p>
<p>📍 <strong>Venue/Link:</strong> <a href="${link}" class="text-primary hover:underline">${link}</a></p>
<p>Kindly be available 10 minutes before the scheduled time.</p>
<p>We look forward to your participation.<br/> - Team YSM Info Solution</p>`
                }
            } else {
                return {
                    body: `Dear *${name}*, this is a reminder for your registered program: *${eventName}*\n\n📅 *Date:* ${date}\n⏰ *Time:* {time}\n📍 *Venue/Link:* ${link}\n\nKindly be available 10 minutes before the scheduled time.\nWe look forward to your participation.\n\n- Team YSM Info Solution`.replace("{time}", time)
                }
            }

        case "REGISTRATION_SUCCESSFUL":
            if (channel === "EMAIL") {
                return {
                    subject: `Registration Successful - ${eventName}`,
                    body: `<p>Dear ${name},</p>
<p>Thank you for registering for <strong>${eventName}</strong> at YSM Info Solution.</p>
<p>📅 <strong>Date:</strong> ${date}</p>
<p>⏰ <strong>Time:</strong> ${time}</p>
<p>📍 <strong>Location/Link:</strong> <a href="${link}" class="text-primary hover:underline">${link}</a></p>
<p>We look forward to your participation. For queries, contact: +91 898 308 3698<br/> - Team YSM Info Solution</p>`
                }
            } else {
                return {
                    body: `Dear *${name}*, thank you for registering for *${eventName}* at YSM Info Solution.\n\n📅 *Date:* ${date}\n⏰ *Time:* ${time}\n📍 *Location/Link:* ${link}\n\nWe look forward to your participation.\nFor queries, contact: +91 898 308 3698\n\n- Team YSM Info Solution`
                }
            }

        case "FEEDBACK_COLLECTION_MESSAGE":
            if (channel === "EMAIL") {
                return {
                    subject: `We Value Your Feedback - ${name}`,
                    body: `<p>Dear ${name},</p>
<p>Thank you for being part of <strong>${eventName}</strong>.</p>
<p>Please share your feedback: <a href="https://g.page/r/CbW3sg1807sqEBM/review" class="text-primary hover:underline">Click here</a></p>
<p>Your input helps us improve and serve students better.<br/> - Team YSM Info Solution</p>`
                }
            } else {
                return {
                    body: `Dear *${name}*, thank you for being part of *${eventName}*.\n\nPlease share your feedback here: https://g.page/r/CbW3sg1807sqEBM/review\n\nYour input helps us improve and serve students better.\n\n- Team YSM Info Solution`
                }
            }

        case "THANK_YOU_FOR_ATTENDING_WORKSHOP":
            if (channel === "EMAIL") {
                return {
                    subject: `Thank You for Attending - ${eventName}`,
                    body: `<p>Dear ${name},</p>
<p>Thank you for attending the <strong>${eventName}</strong> conducted by YSM Info Solution.</p>
<p>We hope the session added value to your learning journey.</p>
<p>Your feedback matters to us: <a href="https://g.page/r/CbW3sg1807sqEBM/review" class="text-primary hover:underline">Share Feedback</a></p>
<p>Stay connected for upcoming programs & opportunities!<br/> - Team YSM Info Solution</p>`
                }
            } else {
                return {
                    body: `Dear *${name}*, thank you for attending the *${eventName}* conducted by YSM Info Solution.\n\nWe hope the session added value to your learning journey.\n\nYour feedback matters to us: https://g.page/r/CbW3sg1807sqEBM/review\n\nStay connected for upcoming programs & opportunities!\n\n- Team YSM Info Solution`
                }
            }

        case "CERTIFICATE_ISSUED":
            if (channel === "EMAIL") {
                return {
                    subject: `Certificate Issued - ${eventName}`,
                    body: `<p>Hello ${name},</p>
<p>Your certificate for <strong>${eventName}</strong> has been issued.</p>
<p><a href="${link}" class="text-primary hover:underline">Download Certificate</a></p>
<p>Keep learning & growing!<br/> - YSM Info Solution</p>`
                }
            } else {
                return {
                    body: `Hello *${name}*, your certificate for *${eventName}* has been issued.\n\nDownload Link: ${link}\n\nKeep learning & growing!\n\n- YSM Info Solution`
                }
            }

        case "WORKSHOP_OR_INTERNSHIP_COMPLETION_MESSAGE":
            if (channel === "EMAIL") {
                return {
                    subject: `Congratulations on Completing - ${eventName}`,
                    body: `<p>Dear ${name},</p>
<p>You have successfully completed the <strong>${eventName}</strong> at YSM Info Solution.</p>
<p>We appreciate your dedication and active participation.</p>
<p>Your certificate has been issued: <a href="${link}" class="text-primary hover:underline">Download Certificate</a></p>
<p>Wishing you success in your career ahead!<br/> - Team YSM Info Solution</p>`
                }
            } else {
                return {
                    body: `Dear *${name}*, you have successfully completed the *${eventName}* at YSM Info Solution.\n\nWe appreciate your dedication and active participation.\n\nYour certificate has been issued: ${link}\n\nWishing you success in your career ahead!\n\n- Team YSM Info Solution`
                }
            }

        case "INTERNSHIP_REGISTRATION_CONFIRMATION":
            if (channel === "EMAIL") {
                return {
                    subject: `Internship Registration Confirmed - ${eventName}`,
                    body: `<p>Dear ${name},</p>
<p>Congratulations! Your registration for the <strong>${eventName}</strong> Internship Program at YSM Info Solution has been successfully completed.</p>
<p>📅 <strong>Start Date:</strong> ${startDate}</p>
<p>📍 <strong>Mode:</strong> ${mode}</p>
<p>⏰ <strong>Reporting Time:</strong> ${reportingTime}</p>
<p>Further instructions will be shared shortly. Welcome aboard! 🚀<br/> - Team YSM Info Solution</p>`
                }
            } else {
                return {
                    body: `Dear *${name}*, congratulations! Your registration for the *${eventName}* Internship Program at YSM Info Solution has been successfully completed.\n\n📅 *Start Date:* ${startDate}\n📍 *Mode:* ${mode}\n⏰ *Reporting Time:* ${reportingTime}\n\nFurther instructions will be shared shortly. Welcome aboard! 🚀\n\n- Team YSM Info Solution`
                }
            }

        case "PAYMENT_CONFIRMATION_MESSAGE":
            if (channel === "EMAIL") {
                return {
                    subject: `Payment Received - ${eventName}`,
                    body: `<p>Dear ${name},</p>
<p>Your payment of <strong>₹${amount}</strong> for <strong>${eventName}</strong> has been successfully received.</p>
<p>Thank you!<br/> - Team YSM Info Solution</p>`
                }
            } else {
                return {
                    body: `Dear *${name}*, your payment of *₹${amount}* for *${eventName}* has been successfully received.\n\nThank you!\n\n- Team YSM Info Solution`
                }
            }

        default:
            return {
                body: `Hello *${name}*, this is a message regarding *${eventName}*.`
            }
    }
}

// ── Component ─────────────────────────────────────────────────────────────

interface EventBulkMessageButtonProps {
    eventId: string
    eventTitle?: string
}

export function EventBulkMessageButton({ eventId, eventTitle }: EventBulkMessageButtonProps) {
    const [open, setOpen] = useState(false)
    const [isSending, setIsSending] = useState(false)

    const [channel, setChannel] = useState<MessageType>("WHATSAPP")
    const [template, setTemplate] = useState<MessageTemplate>("WORKSHOP_REMINDER_MESSAGE")
    const [paramOverrides, setParamOverrides] = useState<Record<string, string>>({})

    // 1. Fetch the first submission for this event to get a representative contact ID
    const { data: submissionsResult, isLoading: isLoadingSubmissions } = useSubmissionsByEvent(eventId, {
        limit: 1,
        offset: 0,
        status: "ALL",
    })

    const representativeContact = useMemo(() => {
        return submissionsResult?.items?.find(s => !!s.contact?.id)?.contact ?? null
    }, [submissionsResult])

    const representativeContactId = representativeContact?.id
    const hasSubmissions = !!submissionsResult?.items && submissionsResult.items.length > 0

    // 2. Setup resolve parameters input and query
    const resolveInput = useMemo(() => {
        if (!representativeContactId || !template) return null
        return {
            contactId: representativeContactId,
            eventId: eventId || undefined,
            template,
        }
    }, [representativeContactId, eventId, template])

    const {
        data: resolvedData,
        isLoading: isResolvingParams,
        error: resolveError,
    } = useResolveParams(resolveInput)

    // Reset overrides when template changes
    useEffect(() => {
        setParamOverrides({})
    }, [template])

    // Derived parameter values: resolved values merged with user overrides
    const mergedParams = useMemo(() => {
        const base = resolvedData?.resolved ?? {}
        return {
            ...base,
            ...paramOverrides,
        }
    }, [resolvedData, paramOverrides])

    // Rendered template preview
    const previewMessage = useMemo(() => {
        return getTemplatePreview(template, channel, mergedParams)
    }, [template, channel, mergedParams])

    // Calculate validation state
    const hasUnfilledMissingParams = useMemo(() => {
        if (!resolvedData) return true
        return resolvedData.missing
            .filter(field => {
                const k = field.toLowerCase()
                return k !== "name" && k !== "eventname" && k !== "eventtitle" && k !== "email" && k !== "phone"
            })
            .some(field => !paramOverrides[field]?.trim())
    }, [resolvedData, paramOverrides])

    const isSendDisabled = useMemo(() => {
        return (
            !hasSubmissions ||
            isLoadingSubmissions ||
            isResolvingParams ||
            hasUnfilledMissingParams ||
            isSending
        )
    }, [hasSubmissions, isLoadingSubmissions, isResolvingParams, hasUnfilledMissingParams, isSending])

    const handleSend = async () => {
        setIsSending(true)
        try {
            // Build params — only non-empty overrides are sent
            const paramsToSend: Record<string, string> = {}
            if (resolvedData) {
                // Collect overrides for both resolved and missing parameters
                const allKeys = [...Object.keys(resolvedData.resolved), ...resolvedData.missing]
                allKeys.forEach(key => {
                    const val = paramOverrides[key]?.trim()
                    if (val) paramsToSend[key] = val
                })
            }

            const result = await bulkSendByEvent(eventId, {
                type: channel,
                template,
                params: Object.keys(paramsToSend).length > 0 ? paramsToSend : undefined,
            })

            toast.success(
                `✅ Bulk send queued: ${result.queued} messages sent, ${result.skipped > 0 ? `${result.skipped} skipped` : "none skipped"}`
            )
            setOpen(false)
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to queue bulk messages. Please try again.")
        } finally {
            setIsSending(false)
        }
    }

    return (
        <>
            <Button
                variant="outline"
                onClick={() => setOpen(true)}
            >
                <MessageSquare className="mr-2 h-4 w-4" />
                Message Submitters
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6">
                    <DialogHeader>
                        <DialogTitle>Message All Submitters</DialogTitle>
                        <DialogDescription>
                            Send a message to every contact who submitted the form for{" "}
                            <span className="font-medium">{eventTitle ?? "this event"}</span>.
                            The backend fetches all submitters automatically.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Dialogue Main Grid Area */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-4 flex-1 overflow-y-auto min-h-0">
                        
                        {/* Left Column: Form Settings (Col 5) */}
                        <div className="md:col-span-5 space-y-4 md:border-r md:pr-6">
                            <h3 className="font-semibold text-sm">Message Settings</h3>

                            {/* Channel */}
                            <div className="space-y-1.5">
                                <Label htmlFor="bulk-channel">Channel</Label>
                                <Select
                                    value={channel}
                                    onValueChange={v => setChannel(v as MessageType)}
                                >
                                    <SelectTrigger id="bulk-channel">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                                        <SelectItem value="EMAIL">Email</SelectItem>
                                        <SelectItem value="SMS">SMS</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Template */}
                            <div className="space-y-1.5">
                                <Label htmlFor="bulk-template">Template</Label>
                                <Select
                                    value={template}
                                    onValueChange={v => setTemplate(v as MessageTemplate)}
                                >
                                    <SelectTrigger id="bulk-template">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TEMPLATES.map(t => (
                                            <SelectItem key={t.value} value={t.value}>
                                                {t.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Params overrides inputs */}
                            <div className="space-y-3 pt-2 border-t">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium">Template Fields & Overrides</label>
                                    {isResolvingParams && (
                                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                                    )}
                                </div>

                                {isLoadingSubmissions && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-muted/50 rounded-md">
                                        <RefreshCw className="h-3 w-3 animate-spin" />
                                        <span>Loading submitter data...</span>
                                    </div>
                                )}

                                {!isLoadingSubmissions && !hasSubmissions && (
                                    <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-md border border-amber-200/50">
                                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-semibold">No submissions found</p>
                                            <p className="text-muted-foreground mt-0.5">Cannot resolve template parameters because no contacts have submitted for this event.</p>
                                        </div>
                                    </div>
                                )}

                                {resolveError && (
                                    <p className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">
                                        Could not resolve parameters automatically. Check event submission details.
                                    </p>
                                )}

                                {resolvedData && !isResolvingParams && (
                                    <div className="space-y-3">
                                        {/* Dynamic unresolved / resolved placeholder indicators */}
                                        <div className="flex flex-wrap gap-1.5 mb-1.5">
                                            <span className="text-[10px] text-muted-foreground bg-muted border px-2 py-0.5 rounded-full font-mono">
                                                Name: [Participant's Name]
                                            </span>
                                            <span className="text-[10px] text-muted-foreground bg-muted border px-2 py-0.5 rounded-full font-mono">
                                                EventName: [Event Name]
                                            </span>
                                        </div>

                                        {/* Resolved Parameters */}
                                        {Object.entries(resolvedData.resolved)
                                            .filter(([key]) => {
                                                const k = key.toLowerCase()
                                                return k !== "name" && k !== "eventname" && k !== "eventtitle" && k !== "email" && k !== "phone"
                                            })
                                            .map(([key, value]) => {
                                                return (
                                                    <div key={key} className="space-y-1">
                                                        <div className="flex items-center justify-between text-xs">
                                                            <span className="text-muted-foreground capitalize font-medium">
                                                                {key}
                                                            </span>
                                                        </div>
                                                        <Input
                                                            className="h-8 text-xs"
                                                            placeholder={`Leave blank to use: ${value || "empty"}`}
                                                            value={paramOverrides[key] ?? ""}
                                                            onChange={(e) =>
                                                                setParamOverrides(prev => ({
                                                                    ...prev,
                                                                    [key]: e.target.value,
                                                                }))
                                                            }
                                                        />
                                                    </div>
                                                );
                                            })}

                                        {/* Missing Required Parameters */}
                                        {resolvedData.missing
                                            .filter(field => {
                                                const k = field.toLowerCase()
                                                return k !== "name" && k !== "eventname" && k !== "eventtitle" && k !== "email" && k !== "phone"
                                            })
                                            .map((field) => (
                                                <div key={field} className="space-y-1">
                                                    <label className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                                        <span>⚠️</span>
                                                        {field} (Required override)
                                                    </label>
                                                    <Input
                                                        className="h-8 text-xs border-amber-300 dark:border-amber-900 focus-visible:ring-amber-500"
                                                        placeholder={`Enter value for ${field}...`}
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

                                        {resolvedData.missing.filter(f => {
                                            const k = f.toLowerCase()
                                            return k !== "name" && k !== "eventname" && k !== "eventtitle" && k !== "email" && k !== "phone"
                                        }).length === 0 && (
                                            <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 pt-1.5 border-t">
                                                <Check className="h-3 w-3" />
                                                All required parameters resolved automatically
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Column: Visual Message Preview (Col 7) */}
                        <div className="md:col-span-7 space-y-4">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-sm">Real-time Message Preview</h3>
                                <Badge variant="outline" className="text-[10px] capitalize">
                                    {channel.toLowerCase()} Mode
                                </Badge>
                            </div>

                            {/* Representative Banner */}
                            {representativeContact && (
                                <div className="flex items-center gap-2 p-2 bg-muted/60 border rounded-lg text-xs">
                                    <Info className="h-4 w-4 text-primary shrink-0" />
                                    <div className="truncate">
                                        Previewing text for: <span className="font-semibold">{representativeContact.name || "Unnamed"}</span> ({representativeContact.email || "No Email"}).
                                    </div>
                                </div>
                            )}

                            {/* Visual Rendering Bubble */}
                            {channel === "WHATSAPP" && (
                                <div className="space-y-2">
                                    <div className="rounded-lg border bg-emerald-50 dark:bg-emerald-950/10 p-4 font-sans relative overflow-hidden">
                                        {/* WhatsApp Header Mock */}
                                        <div className="flex items-center gap-2 pb-2 mb-3 border-b border-emerald-100 dark:border-emerald-900/20">
                                            <div className="h-7 w-7 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] text-white font-bold shrink-0">
                                                YI
                                            </div>
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 truncate">YSM Info Solution</span>
                                                <span className="text-[9px] text-emerald-600 dark:text-emerald-500">Official Business Account</span>
                                            </div>
                                        </div>
                                        {/* WhatsApp Chat Bubble */}
                                        <div className="bg-white dark:bg-zinc-900 rounded-lg p-3 shadow-sm max-w-[90%] text-sm text-foreground space-y-1 relative ml-1 border border-zinc-100 dark:border-zinc-800/40">
                                            <div 
                                                className="whitespace-pre-line break-words text-xs md:text-sm"
                                                dangerouslySetInnerHTML={{ __html: formatWhatsAppText(previewMessage.body) }}
                                            />
                                            <div className="text-[9px] text-muted-foreground text-right mt-1">
                                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground italic text-center">
                                        Note: Values like *Name* and *Email* are replaced dynamically per contact at delivery.
                                    </p>
                                </div>
                            )}

                            {channel === "EMAIL" && (
                                <div className="space-y-2">
                                    <div className="rounded-lg border bg-zinc-50 dark:bg-zinc-950/20 p-4 space-y-3 font-sans">
                                        <div className="space-y-1 text-xs pb-3 border-b border-zinc-200 dark:border-zinc-800">
                                            <div className="flex gap-2">
                                                <span className="text-muted-foreground font-medium w-14 shrink-0">From:</span>
                                                <span className="text-foreground truncate">YSM Info Solution &lt;info@ysminfosolution.com&gt;</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <span className="text-muted-foreground font-medium w-14 shrink-0">To:</span>
                                                <span className="text-foreground truncate">
                                                    {representativeContact 
                                                        ? `${representativeContact.name || "Participant"} <${representativeContact.email || "email@example.com"}>`
                                                        : "all-submitters@ysminfosolution.com"
                                                    }
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <span className="text-muted-foreground font-medium w-14 shrink-0">Subject:</span>
                                                <span className="text-foreground font-semibold truncate">{previewMessage.subject || "No Subject"}</span>
                                            </div>
                                        </div>
                                        <div 
                                            className="text-xs md:text-sm text-foreground bg-white dark:bg-zinc-900 border rounded-lg p-4 min-h-[180px] max-h-[300px] overflow-y-auto prose prose-sm dark:prose-invert max-w-none shadow-inner"
                                            dangerouslySetInnerHTML={{ __html: previewMessage.body }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground italic text-center">
                                        Note: Subject and Body fields (e.g. name, email) are auto-resolved per contact on send.
                                    </p>
                                </div>
                            )}

                            {channel === "SMS" && (
                                <div className="space-y-2">
                                    <div className="rounded-lg border bg-zinc-50 dark:bg-zinc-950/10 p-4 font-sans relative overflow-hidden">
                                        {/* SMS Phone Bubble */}
                                        <div className="bg-zinc-200 dark:bg-zinc-800 text-foreground rounded-2xl px-4 py-2.5 text-xs md:text-sm max-w-[85%] break-words">
                                            {previewMessage.body}
                                        </div>
                                        <div className="text-[9px] text-muted-foreground text-left ml-2 mt-1">
                                            Representative SMS Preview
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Dialogue Footer Actions */}
                    <div className="flex justify-between items-center gap-2 pt-4 border-t mt-auto">
                        <div className="text-xs text-muted-foreground">
                            {representativeContactId ? (
                                <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                                    <Check className="h-3.5 w-3.5" /> Resolved preview successfully
                                </span>
                            ) : (
                                <span className="text-amber-500 font-medium flex items-center gap-1">
                                    <AlertTriangle className="h-3.5 w-3.5" /> No preview recipient available
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setOpen(false)}
                                disabled={isSending}
                            >
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleSend} 
                                disabled={isSendDisabled}
                            >
                                {isSending ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending to All...</>
                                ) : (
                                    <><Send className="mr-2 h-4 w-4" />Send to All</>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}

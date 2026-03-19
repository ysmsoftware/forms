"use client"

import React, { useState, useMemo, useEffect, type ReactNode } from "react"
import { useSendMessage, useResolveParams } from "@/lib/query/hooks/useMessages"
import { MessageType } from "@/lib/api/messages"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Send, RefreshCw, Check, MessageSquare } from "lucide-react"

interface SendCertificateDialogProps {
    contactId: string
    contactName: string
    eventId: string
    eventTitle: string
    certificateFileUrl: string
    trigger: React.ReactNode
    onSuccess?: () => void
}

export function SendCertificateDialog({
    contactId,
    contactName,
    eventId,
    eventTitle,
    certificateFileUrl,
    trigger,
    onSuccess,
}: SendCertificateDialogProps) {
    const [open, setOpen] = useState(false)
    const [msgType, setMsgType] = useState<MessageType>("WHATSAPP")
    const [paramOverrides, setParamOverrides] = useState<Record<string, string>>({})

    const resolveInput = useMemo(() => {
        if (!contactId) return null
        return { contactId, eventId, template: "CERTIFICATE_ISSUED" as const }
    }, [contactId, eventId])

    const {
        data: resolvedData,
        isLoading: isResolvingParams,
        error: resolveError,
    } = useResolveParams(resolveInput)

    // Reset overrides when dialog opens
    useEffect(() => {
        if (open) {
            setParamOverrides({})
            sendMessage.reset()
        }
    }, [open])

    const sendMessage = useSendMessage()

    async function handleSend() {
        try {
            await sendMessage.mutateAsync({
                contactId,
                eventId: eventId || undefined,
                type: msgType,
                template: "CERTIFICATE_ISSUED",
                params: {
                    ...paramOverrides,       // any manual overrides from missing fields
                    link: certificateFileUrl // always override — this is the actual PDF URL
                },
            })
            toast(`Certificate notification sent to ${contactName}.`)
            setOpen(false)
            onSuccess?.()
        } catch (err: any) {
            toast.error("Failed to send notification.")
        }
    }

    const CERTIFICATE_ISSUED_KEYS = useMemo(() => new Set(["name", "eventName", "link"]), [])

    const displayResolved = useMemo(() => {
        if (!resolvedData) return {}
        return Object.fromEntries(
            Object.entries({
                ...resolvedData.resolved,
                link: certificateFileUrl,
            }).filter(([key]) => CERTIFICATE_ISSUED_KEYS.has(key))
        )
    }, [resolvedData, certificateFileUrl, CERTIFICATE_ISSUED_KEYS])

    const hasUnfilledMissing = useMemo(() => {
        if (!resolvedData) return false
        return resolvedData.missing
            .filter(field => CERTIFICATE_ISSUED_KEYS.has(field))
            .some(field => field !== "link" && !paramOverrides[field]?.trim())
    }, [resolvedData, paramOverrides, CERTIFICATE_ISSUED_KEYS])

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val)
            if (!val) {
                setParamOverrides({})
                setMsgType("WHATSAPP")
                sendMessage.reset()
            }
        }}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Send Certificate Notification</DialogTitle>
                    <DialogDescription>
                        Send the CERTIFICATE_ISSUED message to {contactName} for {eventTitle}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4 overflow-x-hidden">
                    {/* Channel Selector */}
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

                    {/* Certificate Link Display */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium">Certificate Link</label>
                        <div className="flex items-start gap-2 px-3 py-2 border rounded-md bg-muted/50 text-xs font-mono text-muted-foreground">
                            <span className="flex-1 break-all min-w-0">{certificateFileUrl}</span>
                            <Badge variant="secondary" className="text-[10px] shrink-0 mt-0.5">Auto-filled</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">This direct PDF link will be sent to the participant.</p>
                    </div>

                    {/* Params Preview */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium">Message Parameters</label>
                            {isResolvingParams && (
                                <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                            )}
                        </div>

                        {resolveError && (
                            <p className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">
                                Could not resolve params.
                            </p>
                        )}

                        {resolvedData && !isResolvingParams && (
                            <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                                {Object.entries(displayResolved).map(([key, value]) => (
                                    <div key={key} className="flex items-start gap-2 text-xs min-w-0">
                                        <span className="text-muted-foreground capitalize min-w-[80px] shrink-0 pt-0.5">
                                            {key}
                                        </span>
                                        <span className="text-foreground font-medium break-all min-w-0 flex-1">
                                            {String(value) || <span className="text-muted-foreground italic">empty</span>}
                                        </span>
                                    </div>
                                ))}

                                {resolvedData.missing.filter(f => CERTIFICATE_ISSUED_KEYS.has(f) && f !== "link").length > 0 && (
                                    <div className="border-t pt-2 mt-2">
                                        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
                                            <span>⚠</span>
                                            {resolvedData.missing.filter(f => CERTIFICATE_ISSUED_KEYS.has(f) && f !== "link").length} field{resolvedData.missing.filter(f => CERTIFICATE_ISSUED_KEYS.has(f) && f !== "link").length !== 1 ? "s" : ""} required
                                        </p>
                                        {resolvedData.missing.filter(f => CERTIFICATE_ISSUED_KEYS.has(f)).map((field) => (
                                            field !== "link" && (
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
                                            )
                                        ))}
                                    </div>
                                )}

                                {resolvedData.missing.filter(f => CERTIFICATE_ISSUED_KEYS.has(f) && f !== "link").length === 0 && (
                                    <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 pt-1 border-t">
                                        <Check className="h-3 w-3" />
                                        All params resolved automatically
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Recipient Info */}
                    <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20">
                        <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">
                            {(contactName.charAt(0) || "?").toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="font-bold text-sm truncate">{contactName}</span>
                            <Badge variant="secondary" className="w-fit text-[10px] px-1 py-0">{eventTitle}</Badge>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={sendMessage.isPending}>
                        Cancel
                    </Button>
                    <Button
                        disabled={sendMessage.isPending || isResolvingParams || hasUnfilledMissing}
                        onClick={handleSend}
                    >
                        {sendMessage.isPending ? (
                            <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Sending...</>
                        ) : (
                            <><Send className="mr-2 h-4 w-4" />Send Notification</>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

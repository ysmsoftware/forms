"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { CheckCircle, Copy, ExternalLink } from "lucide-react"

interface PublishSuccessModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    formUrl: string
    eventTitle: string
}

export function PublishSuccessModal({ open, onOpenChange, formUrl, eventTitle }: PublishSuccessModalProps) {
    const [copied, setCopied] = useState(false)
    const { toast } = useToast()

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(formUrl)
            setCopied(true)
            toast({
                title: "URL Copied!",
                description: "The form URL has been copied to your clipboard.",
            })
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            toast({
                title: "Failed to copy",
                description: "Please copy the URL manually.",
                variant: "destructive",
            })
        }
    }

    const openPublicForm = () => {
        window.open(formUrl, "_blank")
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <DialogTitle className="text-center">Form Published Successfully!</DialogTitle>
                    <DialogDescription className="text-center">
                        Your form "{eventTitle}" is now live and ready to collect responses.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="form-url">Public Form URL</Label>
                        <div className="flex space-x-2">
                            <Input id="form-url" value={formUrl} readOnly className="font-mono text-sm" />
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={copyToClipboard}
                                className={copied ? "bg-green-50 border-green-200" : ""}
                            >
                                <Copy className={`h-4 w-4 ${copied ? "text-green-600" : ""}`} />
                            </Button>
                        </div>
                    </div>

                    <div className="flex space-x-2">
                        <Button onClick={openPublicForm} className="flex-1">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Open Public Form
                        </Button>
                        <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                            Close
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

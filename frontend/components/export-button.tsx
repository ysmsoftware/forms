"use client"

import { useState, useEffect, useRef } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, Loader2, CheckCircle2 } from "lucide-react"

interface ExportButtonProps {
    eventName: string
    onConfirm: () => void
    isExporting: boolean
}

export function ExportButton({ eventName, onConfirm, isExporting }: ExportButtonProps) {
    const [open, setOpen] = useState(false)
    const wasExporting = useRef(false)

    useEffect(() => {
        if (isExporting) {
            wasExporting.current = true
        } else if (wasExporting.current) {
            wasExporting.current = false
            const t = setTimeout(() => setOpen(false), 600)
            return () => clearTimeout(t)
        }
    }, [isExporting])

    const handleConfirm = () => {
        onConfirm()
    }

    const handleOpenChange = (next: boolean) => {
        if (isExporting && !next) return
        setOpen(next)
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" disabled={isExporting} id="export-csv-btn">
                    {isExporting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Exporting…
                        </>
                    ) : (
                        <>
                            <Download className="mr-2 h-4 w-4" />
                            Export CSV
                        </>
                    )}
                </Button>
            </DialogTrigger>

            <DialogContent
                // Prevent closing by clicking backdrop/pressing Escape while exporting
                onInteractOutside={(e) => { if (isExporting) e.preventDefault() }}
                onEscapeKeyDown={(e) => { if (isExporting) e.preventDefault() }}
                className="max-w-md"
            >
                {isExporting ? (
                    /* ── Loading state ── */
                    <>
                        <DialogHeader>
                            <DialogTitle>Generating Export…</DialogTitle>
                            <DialogDescription asChild>
                                <div className="space-y-3 text-sm text-muted-foreground">
                                    <p>
                                        We&apos;re gathering all submissions for{" "}
                                        <span className="font-semibold text-foreground">{eventName}</span> and
                                        building your CSV file.
                                    </p>
                                    <p>This usually takes a few seconds. Please don&apos;t close this tab.</p>
                                </div>
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex flex-col items-center gap-4 py-6">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            <p className="text-sm font-medium text-muted-foreground animate-pulse">
                                Processing submissions…
                            </p>
                        </div>
                    </>
                ) : (
                    /* ── Confirmation state ── */
                    <>
                        <DialogHeader>
                            <DialogTitle>Export Submissions</DialogTitle>
                            <DialogDescription asChild>
                                <div className="space-y-3 text-sm text-muted-foreground">
                                    <p>
                                        You are about to export <strong>all submission data</strong> for{" "}
                                        <span className="font-semibold text-foreground">{eventName}</span>.
                                    </p>
                                    <p>
                                        The data will be downloaded as a <strong>CSV file</strong>, which can
                                        be opened directly in Microsoft Excel, Google Sheets, or any
                                        spreadsheet application.
                                    </p>
                                    <p>
                                        This action will be recorded in the export audit log, including the
                                        date, time, and your user name.
                                    </p>
                                </div>
                            </DialogDescription>
                        </DialogHeader>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleConfirm} id="confirm-export-btn">
                                <Download className="mr-2 h-4 w-4" />
                                Export All Data
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}

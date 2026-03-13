"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, ExternalLink, FileText, FileImage } from "lucide-react"

interface FilePreviewModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    url: string
    fileName?: string
}

export function FilePreviewModal({ open, onOpenChange, url, fileName }: FilePreviewModalProps) {
    const ext = url.split("?")[0].split(".").pop()?.toLowerCase() ?? ""
    const isImage = ["png", "jpg", "jpeg", "webp", "gif"].includes(ext)
    const isPdf = ext === "pdf"
    const displayName = fileName || url.split("/").pop()?.split("?")[0] || "File"

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl w-full">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 truncate">
                        {isImage ? (
                            <FileImage className="h-4 w-4 flex-shrink-0 text-blue-500" />
                        ) : (
                            <FileText className="h-4 w-4 flex-shrink-0 text-orange-500" />
                        )}
                        <span className="truncate">{displayName}</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="mt-2">
                    {isImage && (
                        <img
                            src={url}
                            alt={displayName}
                            className="w-full rounded-lg object-contain max-h-[60vh] bg-muted/30"
                        />
                    )}
                    {isPdf && (
                        <iframe
                            src={url}
                            className="w-full rounded-lg"
                            style={{ height: "60vh" }}
                            title={displayName}
                        />
                    )}
                    {!isImage && !isPdf && (
                        <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/30 rounded-lg">
                            <FileText className="h-12 w-12 text-muted-foreground mb-3" />
                            <p className="text-sm font-medium mb-1">{displayName}</p>
                            <p className="text-xs text-muted-foreground mb-4">
                                Preview not available for this file type
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 mt-2">
                    <Button variant="outline" size="sm" asChild>
                        <a href={url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open in new tab
                        </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                        <a href={url} download={displayName}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                        </a>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

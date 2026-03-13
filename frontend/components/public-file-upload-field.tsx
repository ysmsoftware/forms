import { useState } from "react"
import type { FormField } from "@/lib/types/api"
import { uploadFilePublic } from "@/lib/api/files"
import { Button } from "@/components/ui/button"
import { Loader2, UploadCloud, CheckCircle2, XCircle, } from "lucide-react"

interface PublicFileUploadFieldProps {
    field: FormField
    eventId: string
    eventSlug: string
    visitorId: string
    value: string
    onChange: (url: string) => void
    disabled?: boolean
}

export function PublicFileUploadField({
    field,
    eventId,
    eventSlug,
    visitorId,
    value,
    onChange,
    disabled
}: PublicFileUploadFieldProps) {
    const [uploadState, setUploadState] = useState<"idle" | "uploading" | "done" | "error">(value ? "done" : "idle")
    const [fileName, setFileName] = useState<string>(value ? value.split("/").pop() || "Uploaded File" : "")
    const [errorMessage, setErrorMessage] = useState<string>("")

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            setUploadState("error")
            setErrorMessage("File too large. Maximum size is 10MB.")
            return
        }

        // Validate type (relying on accept attribute mainly, but explicit JS check is good practice)
        const allowedTypes = [
            "image/png", "image/jpeg", "image/jpg",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ]
        if (!allowedTypes.includes(file.type)) {
            setUploadState("error")
            setErrorMessage("Invalid file type. Please upload a supported format.")
            return
        }

        try {
            setUploadState("uploading")
            setErrorMessage("")
            setFileName(file.name)

            const result = await uploadFilePublic({
                file,
                context: "FORM_SUBMISSION",
                eventId,
                eventSlug,
                fieldKey: field.key,
                visitorId
            })

            onChange(result.url)
            setUploadState("done")
        } catch (error: any) {
            setUploadState("error")
            setErrorMessage(error.message || "Failed to upload file")
        }
    }

    const handleRemove = () => {
        onChange("")
        setUploadState("idle")
        setFileName("")
        setErrorMessage("")
    }

    if (uploadState === "done") {
        return (
            <div className={`flex items-center justify-between p-3 border rounded-lg bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-900 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
                <div className="flex items-center space-x-3 overflow-hidden">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500 flex-shrink-0" />
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-green-800 dark:text-green-300 truncate">{fileName}</p>
                        <p className="text-xs text-green-600/80 dark:text-green-400/80">Upload complete</p>
                    </div>
                </div>
                {!disabled && (
                    <Button variant="ghost" size="sm" onClick={handleRemove} className="text-green-700 hover:text-green-800 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/50 ml-2 flex-shrink-0">
                        Remove
                    </Button>
                )}
            </div>
        )
    }

    if (uploadState === "error") {
        return (
            <div className={`p-4 border rounded-lg bg-red-50/80 border-red-200 dark:bg-red-950/20 dark:border-red-900 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
                <div className="flex items-start space-x-3 mb-3">
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-red-800 dark:text-red-300">Upload failed</p>
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errorMessage}</p>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setUploadState("idle")} className="w-full text-red-700 border-red-200 hover:bg-red-100/50 dark:text-red-400 dark:border-red-900/50 dark:hover:bg-red-900/50 bg-white dark:bg-transparent">
                    Try again
                </Button>
            </div>
        )
    }

    return (
        <div className={`relative border-2 border-dashed rounded-lg p-6 hover:bg-muted/50 transition-colors flex flex-col items-center justify-center text-center ${disabled ? "opacity-50 pointer-events-none" : "border-border"}`}>
            <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept=".png,.jpg,.jpeg,.pdf,.doc,.docx"
                onChange={handleFileSelect}
                disabled={disabled || uploadState === "uploading"}
            />
            {uploadState === "uploading" ? (
                <>
                    <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
                    <p className="text-sm font-medium">Uploading...</p>
                    <p className="text-xs text-muted-foreground mt-1">{fileName}</p>
                </>
            ) : (
                <>
                    <div className="rounded-full bg-primary/10 p-3 mb-3">
                        <UploadCloud className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG, PDF, DOC up to 10MB</p>
                </>
            )}
        </div>
    )
}

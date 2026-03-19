"use client"

import { useState } from "react"
import { format } from "date-fns"
import { FileText, Loader2, Paperclip } from "lucide-react"
import { FilePreviewModal } from "@/components/file-preview-modal"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import type { FormSubmission } from "@/lib/types/api"
import { getSubmissionById } from "@/lib/api/submissions"

interface SubmissionTableProps {
    submissions: FormSubmission[]
    paymentEnabled?: boolean
    maxRows?: number
    title?: string
}

const statusColor: Record<string, string> = {
    visiting: "bg-gray-100 text-gray-800 border-gray-200",
    visited: "bg-gray-100 text-gray-800 border-gray-200",
    started: "bg-yellow-100 text-yellow-800 border-yellow-200",
    submitted: "bg-green-100 text-green-800 border-green-200",
}

export function SubmissionTable({
    submissions,
    paymentEnabled = false,
    maxRows,
    title = "Submissions"
}: SubmissionTableProps) {
    const [selected, setSelected] = useState<FormSubmission | null>(null)
    const [open, setOpen] = useState(false)
    const [detailLoading, setDetailLoading] = useState(false)
    const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null)

    const displaySubmissions = maxRows ? submissions.slice(0, maxRows) : submissions

    // Smart Column Detection
    const hasName = submissions.some(s => s.contact?.name)
    const hasEmail = submissions.some(s => s.contact?.email)
    const hasPhone = submissions.some(s => s.contact?.phone)
    const hasContact = hasName || hasEmail || hasPhone

    let answerKeys: string[] = []
    if (!hasContact) {
        answerKeys = submissions[0]?.answers?.slice(0, 4).map(a => a.fieldKey) || []
    }

    const renderSubmissionDetails = () => {
        if (!selected) return null

        const contactDetailsExist = selected.contact?.name || selected.contact?.email || selected.contact?.phone

        return (
            <div className="space-y-6 mt-6">
                {contactDetailsExist && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Contact Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            {selected.contact?.name && (
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="text-muted-foreground font-medium">Name:</span>
                                    <span className="col-span-2">{selected.contact.name}</span>
                                </div>
                            )}
                            {selected.contact?.email && (
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="text-muted-foreground font-medium">Email:</span>
                                    <span className="col-span-2">{selected.contact.email}</span>
                                </div>
                            )}
                            {selected.contact?.phone && (
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="text-muted-foreground font-medium">Phone:</span>
                                    <span className="col-span-2">{selected.contact.phone}</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Submission Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div className="grid grid-cols-3 gap-2 items-center">
                            <span className="text-muted-foreground font-medium">Status:</span>
                            <span className="col-span-2">
                                <Badge className={statusColor[selected.status.toLowerCase()] ?? "bg-gray-100 text-gray-800 border-gray-200"}>
                                    {selected.status.charAt(0) + selected.status.slice(1).toLowerCase()}
                                </Badge>
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <span className="text-muted-foreground font-medium">Submitted At:</span>
                            <span className="col-span-2">
                                {(() => {
                                    try {
                                        return format(new Date(selected.submittedAt), "MMM dd, yyyy 'at' hh:mm a")
                                    } catch {
                                        return selected.submittedAt
                                    }
                                })()}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {paymentEnabled && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Payment</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm">
                            {selected.payment ? (
                                <div className="flex items-center gap-2">
                                    <Badge variant={selected.payment.status.toLowerCase() === "completed" ? "default" : "secondary"} className={selected.payment.status.toLowerCase() === "completed" ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"}>
                                        {selected.payment.status.toLowerCase() === "completed" ? "Paid" : "Pending"}
                                    </Badge>
                                    {selected.payment.amount && <span>₹{selected.payment.amount}</span>}
                                </div>
                            ) : (
                                <span className="text-muted-foreground">No payment recorded</span>
                            )}
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Form Answers</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        {(!selected.answers || selected.answers.length === 0) ? (
                            <div className="text-muted-foreground">No answers recorded</div>
                        ) : (
                            selected.answers.map((answer, idx) => {
                                const label = answer.fieldKey
                                    .replace(/_/g, " ")
                                    .replace(/\b\w/g, c => c.toUpperCase())

                                // FILE answer — render a preview button
                                if (answer.fileUrl) {
                                    return (
                                        <div key={answer.fieldId ?? idx} className="space-y-1">
                                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                {label}
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 text-xs gap-1.5"
                                                onClick={() => setPreviewFile({
                                                    url: answer.fileUrl!,
                                                    name: answer.fileUrl!.split("/").pop()?.split("?")[0] || label
                                                })}
                                            >
                                                <Paperclip className="h-3.5 w-3.5" />
                                                View File
                                            </Button>
                                            {idx < selected.answers.length - 1 && (
                                                <Separator className="mt-3 opacity-50" />
                                            )}
                                        </div>
                                    )
                                }

                                const displayValue =
                                    answer.valueText ??
                                    (answer.valueNumber !== undefined ? String(answer.valueNumber) : null) ??
                                    (answer.valueBoolean !== undefined ? (answer.valueBoolean ? "Yes" : "No") : null) ??
                                    answer.valueDate ??
                                    "—"

                                return (
                                    <div key={answer.fieldId ?? idx} className="space-y-1">
                                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                            {label}
                                        </div>
                                        <div className="text-sm">{displayValue}</div>
                                        {idx < selected.answers.length - 1 && (
                                            <Separator className="mt-3 opacity-50" />
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                    <CardTitle>{title}</CardTitle>
                    {maxRows && submissions.length > maxRows && (
                        <CardDescription>
                            Showing {displaySubmissions.length} of {submissions.length} submissions
                        </CardDescription>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {submissions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-1">No submissions yet</h3>
                        <p className="text-sm text-muted-foreground">
                            Submissions will appear here once visitors start filling out your form.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">#</TableHead>

                                    {/* Dynamic Columns */}
                                    {hasContact ? (
                                        <>
                                            {hasName && <TableHead>Name</TableHead>}
                                            {hasEmail && <TableHead>Email</TableHead>}
                                            {hasPhone && <TableHead>Phone</TableHead>}
                                        </>
                                    ) : (
                                        answerKeys.map(key => (
                                            <TableHead key={key} className="capitalize">{key.replace(/_/g, " ")}</TableHead>
                                        ))
                                    )}

                                    <TableHead>Status</TableHead>
                                    {paymentEnabled && <TableHead>Payment</TableHead>}
                                    <TableHead>Submitted At</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {displaySubmissions.map((sub, idx) => (
                                    <TableRow key={sub.id}>
                                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>

                                        {/* Dynamic Columns Data */}
                                        {hasContact ? (
                                            <>
                                                {hasName && <TableCell className="font-medium">{sub.contact?.name ?? "—"}</TableCell>}
                                                {hasEmail && <TableCell>{sub.contact?.email ?? "—"}</TableCell>}
                                                {hasPhone && <TableCell>{sub.contact?.phone ?? "—"}</TableCell>}
                                            </>
                                        ) : (
                                            answerKeys.map(key => {
                                                const ans = sub.answers?.find(a => a.fieldKey === key)
                                                const val = ans?.valueText ?? ans?.valueNumber ?? (ans?.valueBoolean !== undefined ? ans.valueBoolean.toString() : null) ?? ans?.valueDate ?? "—"
                                                return <TableCell key={key} className="truncate max-w-[150px]">{val}</TableCell>
                                            })
                                        )}

                                        <TableCell>
                                            <Badge className={statusColor[sub.status.toLowerCase()] ?? "bg-gray-100 text-gray-800 border-gray-200"}>
                                                {sub.status.charAt(0) + sub.status.slice(1).toLowerCase()}
                                            </Badge>
                                        </TableCell>

                                        {paymentEnabled && (
                                            <TableCell>
                                                {sub.payment ? (
                                                    <Badge variant={sub.payment.status.toLowerCase() === "completed" ? "default" : "secondary"} className={sub.payment.status.toLowerCase() === "completed" ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"}>
                                                        {sub.payment.status.toLowerCase() === "completed" ? "Paid" : "Pending"}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="bg-gray-100 text-gray-800 hover:bg-gray-100">—</Badge>
                                                )}
                                            </TableCell>
                                        )}

                                        <TableCell className="text-muted-foreground whitespace-nowrap">
                                            {(() => {
                                                try {
                                                    return format(new Date(sub.submittedAt), "MMM dd, yyyy hh:mm a")
                                                } catch {
                                                    return sub.submittedAt
                                                }
                                            })()}
                                        </TableCell>

                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={async () => {
                                                    setSelected(sub)  // show sheet immediately with list data
                                                    setOpen(true)
                                                    setDetailLoading(true)
                                                    try {
                                                        const full = await getSubmissionById(sub.id)
                                                        setSelected(full) // replace with full data (all answers)
                                                    } catch {
                                                        // keep list data as fallback
                                                    } finally {
                                                        setDetailLoading(false)
                                                    }
                                                }}
                                            >
                                                View Details
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>

            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>Submission Details</SheetTitle>
                        <SheetDescription>
                            {selected && (() => {
                                try {
                                    return `Submitted ${format(new Date(selected.submittedAt), "MMM dd, yyyy 'at' hh:mm a")}`
                                } catch {
                                    return `Submitted at ${selected.submittedAt}`
                                }
                            })()}
                        </SheetDescription>
                    </SheetHeader>

                    {detailLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-sm text-muted-foreground">Loading full submission...</span>
                        </div>
                    ) : (
                        renderSubmissionDetails()
                    )}
                </SheetContent>
            </Sheet>

            {previewFile && (
                <FilePreviewModal
                    open={!!previewFile}
                    onOpenChange={(open) => { if (!open) setPreviewFile(null) }}
                    url={previewFile.url}
                    fileName={previewFile.name}
                />
            )}
        </Card>
    )
}

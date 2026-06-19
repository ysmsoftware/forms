"use client"

import { format } from "date-fns"
import { FileDown, Clock } from "lucide-react"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { ExportLog } from "@/lib/types/api"

interface ExportLogTableProps {
    logs: ExportLog[]
    isLoading: boolean
}

export function ExportLogTable({ logs, isLoading }: ExportLogTableProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <FileDown className="h-4 w-4 text-muted-foreground" />
                    Export History
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {isLoading ? (
                    <div className="p-4 space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full" />
                        ))}
                    </div>
                ) : logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                        <Clock className="h-8 w-8 opacity-40" />
                        <p className="text-sm">No exports yet for this event.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Exported By</TableHead>
                                <TableHead>Date &amp; Time</TableHead>
                                <TableHead className="text-center">Records</TableHead>
                                <TableHead>File Name</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="font-medium">
                                        {log.exportedByName}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {format(new Date(log.exportedAt), "MMM dd, yyyy · HH:mm")}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="secondary">{log.rowCount}</Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-xs font-mono truncate max-w-[240px]">
                                        {log.fileName}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    )
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueExportSubmissions, getExportStatus, downloadExport, getExportLogs } from "@/lib/api/submissions";
import { queryKeys } from "../keys";

/**
 * Mutation hook: triggers a CSV export for the given event,
 * polls until processing is completed, and then auto-downloads
 * the generated file in the browser.
 */
export function useExportSubmissions(eventId: string) {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            // 1. Enqueue the export request
            const enqueueRes = await enqueueExportSubmissions(eventId);
            const { exportLogId } = enqueueRes;

            // 2. Poll until status is DONE or FAILED
            const pollIntervalMs = 2000;
            const maxPolls = 150; // 5 minutes timeout

            for (let i = 0; i < maxPolls; i++) {
                await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

                const statusRes = await getExportStatus(exportLogId);

                if (statusRes.status === "DONE") {
                    // 3. Download the generated CSV file
                    const downloadRes = await downloadExport(exportLogId);
                    return { blob: downloadRes.blob, fileName: downloadRes.fileName };
                }

                if (statusRes.status === "FAILED") {
                    throw new Error(statusRes.errorMessage ?? "Export processing failed on the server.");
                }
            }

            throw new Error("Export request timed out. Please check the audit logs below to download the file when ready.");
        },
        onSuccess: ({ blob, fileName }) => {
            // Trigger browser download
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // Refresh the audit log table
            qc.invalidateQueries({ queryKey: queryKeys.exports.logs(eventId) });
        },
    });
}

/**
 * Query hook: fetches the export audit log for a given event.
 */
export function useExportLogs(eventId: string) {
    return useQuery({
        queryKey: queryKeys.exports.logs(eventId),
        queryFn: () => getExportLogs(eventId),
        enabled: !!eventId,
        staleTime: 30_000,
    });
}

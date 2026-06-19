import { apiClient, publicClient } from "./client";
import type {
    FormSubmission,
    SubmissionListResponse,
    SubmitFormInput,
    ExportLog,
} from "../types/api";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";


export interface SubmitFormResult {
    submissionId: string
    status: string
    submittedAt: string

}

// ── Public visitor flow ──────────────────────────────────

export async function loadPublicForm(slug: string): Promise<any> {
    return publicClient(`/forms/slug/${slug}`);
}

function getVisitorMeta() {
    return {
        ipAddress: "0.0.0.0",          // browser can't read real IP — backend can override via req.ip
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
    };
}

export async function recordVisit(slug: string, visitorUuid: string): Promise<void> {
    return publicClient(`/submissions/${slug}/visit`, {
        method: "POST",
        body: JSON.stringify({
            visitor: { uuid: visitorUuid, ...getVisitorMeta() },
        }),
    });
}

export async function startSubmission(slug: string, visitorUuid: string): Promise<void> {
    return publicClient(`/submissions/${slug}/start`, {
        method: "POST",
        body: JSON.stringify({
            slug,
            visitor: { uuid: visitorUuid },
        }),
    });
}

export async function saveDraft(slug: string, data: SubmitFormInput): Promise<void> {
    return publicClient(`/submissions/${slug}/draft`, {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export async function getDraft(slug: string, visitorUuid: string): Promise<any> {
    return publicClient(`/submissions/${slug}/draft?visitorUuid=${visitorUuid}`);
}

export async function submitForm(
    slug: string,
    data: SubmitFormInput
): Promise<SubmitFormResult> {
    return publicClient(`/submissions/${slug}/submit`, {
        method: "POST",
        body: JSON.stringify({
            slug,
            visitor: {
                uuid: data.visitor.uuid,
                ipAddress: "0.0.0.0",
                userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
            },
            contact: data.contact,
            answers: data.answers,
        }),
    });
}

// ── Admin view ───────────────────────────────────────────

export async function getSubmissionsByEvent(
    eventId: string,
    params?: { limit?: number; offset?: number; status?: string }
): Promise<SubmissionListResponse> {
    const limit = params?.limit ?? 20
    const offset = params?.offset ?? 0
    const status = params?.status ?? "ALL"
    return apiClient(
        `/submissions/admin/events/${eventId}/submissions?limit=${limit}&offset=${offset}&status=${status}`
    );
}

export async function getSubmissionById(
    submissionId: string
): Promise<FormSubmission> {
    return apiClient(`/submissions/admin/submissions/${submissionId}`);
}

// ── Export ───────────────────────────────────────────────

export interface EnqueueExportResponse {
    exportLogId: string;
    jobId: string;
    status: string;
}

export interface ExportStatusResponse {
    exportLogId: string;
    status: string;
    rowCount: number;
    fileName: string;
    errorMessage: string | null;
    exportedAt: string;
    exportedByName: string;
}

/**
 * Enqueues a CSV export for an event.
 */
export async function enqueueExportSubmissions(
    eventId: string
): Promise<EnqueueExportResponse> {
    return apiClient<EnqueueExportResponse>(`/exports/admin/events/${eventId}/export`, {
        method: "POST",
    });
}

/**
 * Fetches the status of an export job.
 */
export async function getExportStatus(
    exportLogId: string
): Promise<ExportStatusResponse> {
    return apiClient<ExportStatusResponse>(`/exports/admin/exports/${exportLogId}/status`);
}

/**
 * Downloads the completed export CSV file.
 */
export async function downloadExport(
    exportLogId: string
): Promise<{ blob: Blob; fileName: string }> {
    const res = await fetch(`${BASE_URL}/exports/admin/exports/${exportLogId}/download`, {
        method: "GET",
        credentials: "include",
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Download failed" }));
        throw new Error(body.message ?? "Download failed");
    }

    const contentDisposition = res.headers.get("Content-Disposition") ?? "";
    // Prefer the explicit X-File-Name header (exact value, no parsing needed)
    const xFileName = res.headers.get("X-File-Name");
    // Fallback: parse filename* (RFC 5987) then filename from Content-Disposition
    const rfc5987Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    const legacyMatch = contentDisposition.match(/filename="([^"]+)"/i);
    const fileName =
        xFileName ??
        (rfc5987Match ? decodeURIComponent(rfc5987Match[1]) : null) ??
        legacyMatch?.[1] ??
        `export-${exportLogId}.csv`;

    const blob = await res.blob();
    return { blob, fileName };
}

/**
 * Returns the export audit log for a given event.
 */
export async function getExportLogs(eventId: string): Promise<ExportLog[]> {
    return apiClient<ExportLog[]>(`/exports/admin/events/${eventId}/export-logs`);
}

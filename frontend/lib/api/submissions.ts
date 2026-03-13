import { apiClient, publicClient } from "./client";
import type {
    FormSubmission,
    SubmissionListResponse,
    SubmitFormInput,
} from "../types/api";

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
): Promise<FormSubmission> {
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
    eventId: string
): Promise<SubmissionListResponse> {
    return apiClient(`/submissions/admin/events/${eventId}/submissions`);
}

export async function getSubmissionById(
    submissionId: string
): Promise<FormSubmission> {
    return apiClient(`/submissions/admin/submissions/${submissionId}`);
}

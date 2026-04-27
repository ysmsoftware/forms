import { apiClient } from "./client";

export interface FileUploadResult {
    id: string
    url: string
    name: string
    mimeType: string
    size: number
    fieldKey?: string | null
    expiresAt?: string | null
    createdAt: string
}

export interface UploadFileInput {
    file: File
    context: "FORM_SUBMISSION" | "EVENT_ASSET" | "FORM_CERTIFICATE" | "USER_AVATAR"
    organizationId?: string
    eventId?: string
    eventSlug?: string
    fieldKey?: string
    visitorId?: string
    contactId?: string
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

function buildFormData(input: UploadFileInput): FormData {
    const fd = new FormData();
    fd.append("file", input.file);
    fd.append("context", input.context);
    if (input.organizationId) fd.append("organizationId", input.organizationId);
    if (input.eventId) fd.append("eventId", input.eventId);
    if (input.eventSlug) fd.append("eventSlug", input.eventSlug);
    if (input.fieldKey) fd.append("fieldKey", input.fieldKey);
    if (input.visitorId) fd.append("visitorId", input.visitorId);
    if (input.contactId) fd.append("contactId", input.contactId);
    return fd;
}

export async function uploadFilePublic(input: UploadFileInput): Promise<FileUploadResult> {
    const fd = buildFormData(input);

    const res = await fetch(`${BASE_URL}/files/upload`, {
        method: "POST",
        body: fd,
    });

    if (!res.ok) {
        let msg = "Upload failed";
        try {
            const errBody = await res.json();
            msg = errBody.message || msg;
        } catch {
            // ignore JSON parse error
        }
        throw new Error(msg);
    }

    const json = await res.json();
    return json.data;
}

export async function uploadFileAdmin(input: UploadFileInput): Promise<FileUploadResult> {
    const fd = buildFormData(input);

    // multipart/form-data — do NOT set Content-Type, browser sets it with boundary
    // credentials:include sends the httpOnly accessToken cookie automatically
    const res = await fetch(`${BASE_URL}/files/upload`, {
        method: "POST",
        credentials: "include",
        body: fd,
    });

    if (!res.ok) {
        let msg = "Upload failed";
        try { const e = await res.json(); msg = e.message || msg; } catch { }
        throw new Error(msg);
    }

    const json = await res.json();
    return json.data;
}

export async function deleteFileAdmin(id: string): Promise<void> {
    return apiClient(`/files/${id}`, { method: "DELETE" });
}

export async function getFilesByEvent(eventId: string): Promise<FileUploadResult[]> {
    return apiClient<FileUploadResult[]>(`/files/event/${eventId}`);
}






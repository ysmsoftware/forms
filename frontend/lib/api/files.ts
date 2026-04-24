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
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

    const res = await fetch(`${BASE_URL}/files/upload`, {
        method: "POST",
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: fd,
    });

    if (!res.ok) {
        let msg = "Upload failed";
        try {
            const errBody = await res.json();
            msg = errBody.message || msg;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json = await res.json();
    return json.data;
}

export async function deleteFileAdmin(id: string): Promise<void> {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

    const res = await fetch(`${BASE_URL}/files/${id}`, {
        method: "DELETE",
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });

    if (!res.ok) {
        let msg = "Delete failed";
        try {
            const errBody = await res.json();
            msg = errBody.message || msg;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }
}

export async function getFilesByEvent(eventId: string): Promise<FileUploadResult[]> {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

    const res = await fetch(`${BASE_URL}/files/event/${eventId}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });

    if (!res.ok) {
        let msg = "Failed to fetch files";
        try {
            const errBody = await res.json();
            msg = errBody.message || msg;
        } catch {
            // ignore
        }
        throw new Error(msg);
    }

    const json = await res.json();
    return json.data;
}

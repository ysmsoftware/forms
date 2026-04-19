import { apiClient } from "./client";
import type { 
    Contact, 
    ContactDetail, 
    ContactEventsResponse, 
    ContactCertificatesResponse, 
    ContactPaymentsResponse, 
    ContactMessagesResponse, 
    ContactTagsResponse, 
    ContactFilesResponse 
} from "../types/api";

// Extended Contact type returned by the contacts API (includes relations)
export interface ContactWithRelations extends Contact {
    tags?: { id: string; name: string }[];
    contactEvents?: { eventId: string; source?: string }[];
}

export interface ContactListResponse {
    total: number;
    contacts: ContactWithRelations[];
}

/**
 * Flatten the nested JOIN-table shape the backend returns for tags.
 * Backend:  { tagId: "abc", tag: { id: "abc", name: "VIP" } }
 * Frontend: { id: "abc", name: "VIP" }
 */
function normalizeContact(c: any): ContactWithRelations {
    return {
        ...c,
        tags: (c.tags ?? []).map((t: any) => ({
            id: t.tag?.id ?? t.tagId ?? t.id,
            name: t.tag?.name ?? t.name ?? "",
        })),
        contactEvents: c.contactEvents ?? [],
    };
}

export async function listContacts(
    params?: { search?: string; lastId?: string; take?: number }
): Promise<ContactListResponse> {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.lastId) query.set("lastId", params.lastId);
    if (params?.take) query.set("take", String(params.take));
    const qs = query.toString();
    const res: any = await apiClient(`/contacts${qs ? `?${qs}` : ""}`);
    return {
        total: res.total,
        contacts: (res.contacts ?? []).map(normalizeContact),
    };
}

export async function createContact(
    body: { name?: string; email?: string; phone?: string }
): Promise<ContactWithRelations> {
    const raw: any = await apiClient("/contacts", {
        method: "POST",
        body: JSON.stringify(body),
    });
    return normalizeContact(raw);
}

export async function updateContact(
    id: string,
    body: { name?: string; email?: string; phone?: string }
): Promise<ContactWithRelations> {
    const raw: any = await apiClient(`/contacts/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
    });
    return normalizeContact(raw);
}

export async function deleteContact(id: string): Promise<void> {
    return apiClient(`/contacts/${id}`, {
        method: "DELETE",
    });
}


export async function getContact(id: string): Promise<ContactDetail> {
    const res: any = await apiClient(`/contacts/${id}`, {
        method: 'GET'
    });
    return res as ContactDetail;
}

export async function getContactEvents(id: string): Promise<ContactEventsResponse> {
    const res: any = await apiClient(`/contacts/${id}/events`, {
        method: 'GET'
    });
    return res as ContactEventsResponse;
}

export async function getContactCertificates(id: string): Promise<ContactCertificatesResponse> {
    const res: any = await apiClient(`/contacts/${id}/certificates`, {
        method: 'GET'
    });
    return res as ContactCertificatesResponse;
}

export async function getContactPayments(
    id: string,
    params?: { limit?: number; cursor?: string; status?: string }
): Promise<ContactPaymentsResponse> {
    const query = new URLSearchParams();
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.cursor) query.set("cursor", params.cursor);
    if (params?.status) query.set("status", params.status);
    const qs = query.toString();
    const res: any = await apiClient(`/contacts/${id}/payments${qs ? `?${qs}` : ""}`, {
        method: 'GET'
    });
    return res as ContactPaymentsResponse;
}

export async function getContactMessages(
    id: string,
    params?: { limit?: number; offset?: number }
): Promise<ContactMessagesResponse> {
    const query = new URLSearchParams();
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.offset) query.set("offset", String(params.offset));
    const qs = query.toString();
    const res: any = await apiClient(`/contacts/${id}/messages${qs ? `?${qs}` : ""}`, {
        method: 'GET'
    });
    return res as ContactMessagesResponse;
}

export async function getContactTags(id: string): Promise<ContactTagsResponse> {
    const res: any = await apiClient(`/contacts/${id}/tags`, {
        method: 'GET'
    });
    // Normalize the JOIN table response to just Tag objects
    return {
        tags: res.tags ?? [],
        total: res.total ?? 0
    };
}

export async function getContactFiles(id: string): Promise<ContactFilesResponse> {
    const res: any = await apiClient(`/contacts/${id}/files`, {
        method: 'GET'
    });
    return res as ContactFilesResponse;
}
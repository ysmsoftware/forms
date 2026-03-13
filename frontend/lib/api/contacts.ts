import { apiClient } from "./client";
import type { Contact } from "../types/api";

// Extended Contact type returned by the contacts API (includes relations)
export interface ContactWithRelations extends Contact {
    tags?: { id: string; name: string }[];
    contactEvents?: { eventId: string }[];
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

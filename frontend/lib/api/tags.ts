import { apiClient } from "./client";

export type Tag = { id: string; name: string };

export async function listTags(): Promise<Tag[]> {
    return apiClient("/tags");
}

export async function createTag(name: string): Promise<Tag> {
    return apiClient("/tags", {
        method: "POST",
        body: JSON.stringify({ name }),
    });
}

export async function assignTag(contactId: string, tagId: string): Promise<void> {
    return apiClient("/tags/assign", {
        method: "POST",
        body: JSON.stringify({ contactId, tagId }),
    });
}

export async function removeTag(contactId: string, tagId: string): Promise<void> {
    return apiClient("/tags/remove", {
        method: "POST",
        body: JSON.stringify({ contactId, tagId }),
    });
}

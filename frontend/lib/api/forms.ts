import { apiClient, publicClient } from "./client";
import type { Form, CreateFormInput } from "../types/api";

export async function getFormByEventId(eventId: string): Promise<Form> {
    return apiClient(`/forms/event/${eventId}`);
}

export async function getFormBySlug(slug: string): Promise<Form> {
    return publicClient(`/forms/slug/${slug}`);
}

export async function createForm(
    eventId: string,
    data: CreateFormInput
): Promise<Form> {
    return apiClient(`/forms/event/${eventId}`, {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export async function updateForm(
    eventId: string,
    data: CreateFormInput
): Promise<Form> {
    return apiClient(`/forms/event/${eventId}`, {
        method: "PUT",
        body: JSON.stringify(data),
    });
}

export async function publishForm(formId: string): Promise<Form> {
    return apiClient(`/forms/${formId}/publish`, { method: "POST" });
}

export async function deleteForm(formId: string): Promise<void> {
    return apiClient(`/forms/${formId}`, { method: "DELETE" });
}

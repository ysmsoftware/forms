import { apiClient, publicClient } from "./client";
import type { Event, CreateEventInput } from "../types/api";

export async function getEvents(): Promise<Event[]> {
    return apiClient("/events/");
}

export async function getEventById(id: string): Promise<Event> {
    return apiClient(`/events/${id}`);
}

export async function getEventBySlug(slug: string): Promise<Event> {
    return publicClient(`/events/slug/${slug}`);
}

export async function createEvent(data: CreateEventInput): Promise<Event> {
    return apiClient("/events", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export async function updateEvent(
    id: string,
    data: Partial<CreateEventInput> & { bannerUrl?: string | null }
): Promise<Event> {
    return apiClient(`/events/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
    });
}

export async function publishEvent(id: string): Promise<Event> {
    return apiClient(`/events/${id}/publish`, { method: "PUT" });
}

export async function closeEvent(id: string): Promise<Event> {
    return apiClient(`/events/${id}/close`, { method: "PATCH" });
}

export async function deleteEvent(id: string): Promise<void> {
    return apiClient(`/events/${id}`, { method: "DELETE" });
}

/**
 * Deep-duplicates an event (including form, steps, fields, and payment config)
 * on the server side. Both the event and form are created with status DRAFT.
 */
export async function duplicateEvent(id: string, title: string): Promise<Event> {
    return apiClient<Event>(`/events/${id}/duplicate`, {
        method: "POST",
        body: JSON.stringify({ title }),
    });
}

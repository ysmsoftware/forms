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
    data: Partial<CreateEventInput>
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
 * Client-side event duplication — copies title, description, date, and link only.
 * Does NOT copy: form fields, form steps, payment config, or any submissions.
 *
 * For a full deep copy including form fields, a backend endpoint
 * POST /events/:id/duplicate should be implemented.
 */
export async function duplicateEvent(id: string): Promise<Event> {
    // Fetch the event, then create a copy
    const original = await apiClient<Event>(`/events/${id}`);
    return apiClient<Event>("/events", {
        method: "POST",
        body: JSON.stringify({
            title: `${original.title} (Copy)`,
            description: original.description,
            slug: `${original.slug}-copy-${Date.now()}`,
            date: original.date,
            link: original.link,
        }),
    });
}

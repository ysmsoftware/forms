import type { CertificateFilters } from "@/lib/api/certificate"

export const queryKeys = {
    // Events
    events: {
        all: ["events"] as const,
        list: () => [...queryKeys.events.all, "list"] as const,
        detail: (id: string) => [...queryKeys.events.all, "detail", id] as const,
    },
    // Analytics
    analytics: {
        all: ["analytics"] as const,
        global: () => [...queryKeys.analytics.all, "global"] as const,
        byEvent: (id: string) => [...queryKeys.analytics.all, "event", id] as const,
        daily: (id: string, days: number) =>
            [...queryKeys.analytics.all, "daily", id, days] as const,
        globalDaily: (days: number) =>
            [...queryKeys.analytics.all, "globalDaily", days] as const,
    },
    // Contacts
    contacts: {
        all: ["contacts"] as const,
        list: (params: { search?: string; lastId?: string }) =>
            [...queryKeys.contacts.all, "list", params] as const,
        detail: (id: string) => [...queryKeys.contacts.all, "detail", id] as const,
        events: (id: string) => [...queryKeys.contacts.all, "events", id] as const,
        certificates: (id: string) => [...queryKeys.contacts.all, "certificates", id] as const,
        payments: (id: string, params?: { limit?: number; cursor?: string; status?: string }) =>
            [...queryKeys.contacts.all, "payments", id, params ?? {}] as const,
        messages: (id: string, params?: { limit?: number; offset?: number }) =>
            [...queryKeys.contacts.all, "messages", id, params ?? {}] as const,
        tags: (id: string) => [...queryKeys.contacts.all, "tags", id] as const,
        files: (id: string) => [...queryKeys.contacts.all, "files", id] as const,
    },
    // Tags
    tags: {
        all: ["tags"] as const,
        list: () => [...queryKeys.tags.all, "list"] as const,
    },
    // User
    user: {
        me: ["user", "me"] as const,
    },

    messages: {
        all: ["messages"] as const,
        list: (params?: { contactId?: string; eventId?: string; email?: string; phone?: string }) =>
            [...queryKeys.messages.all, "list", params ?? {}] as const,
    },
    // Submissions
    submissions: {
        all: ["submissions"] as const,
        byEvent: (eventId: string) => [...queryKeys.submissions.all, "byEvent", eventId] as const,
        detail: (id: string) => [...queryKeys.submissions.all, "detail", id] as const,
    },
    // Files
    files: {
        all: ["files"] as const,
        byEvent: (eventId: string) => [...queryKeys.files.all, "event", eventId] as const,
    },
    // Certificates
    certificates: {
        all: ["certificates"] as const,
        list: (filters: CertificateFilters) => ["certificates", "list", filters] as const,
        byEvent: (eventId: string, page?: number, limit?: number) => ["certificates", "event", eventId, page ?? 1, limit ?? 20] as const,
        verify: (certificateId: string) => ["certificates", "verify", certificateId] as const,
    },

} as const
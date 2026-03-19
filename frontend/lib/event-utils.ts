// ─── Event status → Tailwind class mapping ────────────────────────────────
// Used by: dashboard/page.tsx, dashboard/events/page.tsx, event/[id]/edit/page.tsx

export const EVENT_STATUS_COLORS: Record<string, string> = {
    DRAFT: "bg-yellow-100 text-yellow-800 border-yellow-200",
    ACTIVE: "bg-green-100  text-green-800  border-green-200",
    CLOSED: "bg-gray-100   text-gray-800   border-gray-200",
}

export function getStatusColor(status: string): string {
    return EVENT_STATUS_COLORS[status] ?? EVENT_STATUS_COLORS.CLOSED
}

// ─── Copy public form URL to clipboard ───────────────────────────────────
// Used by: dashboard/page.tsx, dashboard/events/page.tsx

export function getFormUrl(slug: string): string {
    if (typeof window === "undefined") return `/form/${slug}`
    return `${window.location.origin}/form/${slug}`
}

export async function copyFormUrl(slug: string): Promise<void> {
    await navigator.clipboard.writeText(getFormUrl(slug))
}

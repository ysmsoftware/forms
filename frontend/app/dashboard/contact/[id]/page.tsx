"use client"

import { useMemo, useState, useRef, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
    ArrowLeft,
    Mail,
    Phone,
    FileText,
    MessageSquare,
    CreditCard,
    Tag as TagIcon,
    Download,
    AlertCircle,
    Award,
    CheckCircle2,
    Clock,
    XCircle,
    ExternalLink,
    Hash,
    Inbox,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Plus,
    X,
    Search,
    Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { SectionErrorBoundary } from "@/components/section-error-boundary"
import {
    useContactDetail,
    useContactEvents,
    useContactCertificates,
    useContactPayments,
    useContactMessages,
    useContactTags,
    useContactFiles,
    useRemoveTag,
    useAssignTag,
    useCreateTag,
    useTags,
} from "@/lib/query/hooks/useContacts"
import { useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query/keys"
import type {
    ContactDetail,
    ContactEvent,
    ContactTagRelation,
    Tag,
} from "@/lib/types/api"

// ─── constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

// ─── utilities ────────────────────────────────────────────────────────────────

function initials(name?: string | null) {
    if (!name) return "?"
    return name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
}

function fmtDate(date?: string | null) {
    if (!date) return "—"
    return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function fmtDatetime(date?: string | null) {
    if (!date) return "—"
    return new Date(date).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    })
}

function fmtBytes(bytes: number) {
    if (!bytes) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

// ─── status pill ──────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { cls: string; icon: React.ReactNode }> = {
    SENT: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800", icon: <CheckCircle2 size={10} /> },
    GENERATED: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800", icon: <CheckCircle2 size={10} /> },
    COMPLETED: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800", icon: <CheckCircle2 size={10} /> },
    ACTIVE: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800", icon: <CheckCircle2 size={10} /> },
    UPLOADED: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800", icon: <CheckCircle2 size={10} /> },
    PENDING: { cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800", icon: <Clock size={10} /> },
    QUEUED: { cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800", icon: <Clock size={10} /> },
    PROCESSING: { cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800", icon: <Clock size={10} /> },
    FAILED: { cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800", icon: <XCircle size={10} /> },
    CANCELLED: { cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800", icon: <XCircle size={10} /> },
}

function StatusPill({ status }: { status: string }) {
    const cfg = STATUS_MAP[status] ?? {
        cls: "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
        icon: null,
    }
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${cfg.cls}`}>
            {cfg.icon}{status}
        </span>
    )
}

// ─── pagination: offset-based ─────────────────────────────────────────────────

function PaginationBar({ page, total, limit, onPage }: { page: number; total: number; limit: number; onPage: (p: number) => void }) {
    const totalPages = Math.ceil(total / limit)
    if (totalPages <= 1) return null
    return (
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-zinc-100 dark:border-zinc-800">
            <span className="text-[11px] text-zinc-400">
                {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
            </span>
            <div className="flex items-center gap-1">
                <button disabled={page === 1} onClick={() => onPage(page - 1)} className="p-1 rounded-md disabled:opacity-30 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500">
                    <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-medium text-zinc-500 px-1">{page} / {totalPages}</span>
                <button disabled={page === totalPages} onClick={() => onPage(page + 1)} className="p-1 rounded-md disabled:opacity-30 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500">
                    <ChevronRight size={14} />
                </button>
            </div>
        </div>
    )
}

// ─── pagination: cursor-based ─────────────────────────────────────────────────

function CursorPaginationBar({ onPrev, onNext, hasPrev, hasNext, showing, total }: { onPrev: () => void; onNext: () => void; hasPrev: boolean; hasNext: boolean; showing: number; total: number }) {
    if (total <= PAGE_SIZE) return null
    return (
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-zinc-100 dark:border-zinc-800">
            <span className="text-[11px] text-zinc-400">Showing {showing} of {total}</span>
            <div className="flex items-center gap-1">
                <button disabled={!hasPrev} onClick={onPrev} className="p-1 rounded-md disabled:opacity-30 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500">
                    <ChevronLeft size={14} />
                </button>
                <button disabled={!hasNext} onClick={onNext} className="p-1 rounded-md disabled:opacity-30 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500">
                    <ChevronRight size={14} />
                </button>
            </div>
        </div>
    )
}

// ─── section wrapper ──────────────────────────────────────────────────────────

function Section({ icon, title, count, children }: { icon: React.ReactNode; title: string; count?: number; children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden h-full flex flex-col">
            <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0">
                <span className="text-zinc-400">{icon}</span>
                <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 tracking-tight">{title}</h2>
                {count !== undefined && <span className="ml-auto text-xs font-medium text-zinc-400">{count}</span>}
            </div>
            <div className="p-5 flex-1">{children}</div>
        </div>
    )
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center py-8 gap-2 text-center">
            <Inbox size={24} className="text-zinc-300 dark:text-zinc-600" />
            <p className="text-xs text-zinc-400">{message}</p>
        </div>
    )
}

function MetaCell({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 p-3.5">
            <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{value}</p>
        </div>
    )
}

// ─── avatar gradient ──────────────────────────────────────────────────────────

const AVATAR_GRADIENTS = [
    "from-violet-400 to-purple-600",
    "from-cyan-400 to-blue-600",
    "from-emerald-400 to-teal-600",
    "from-rose-400 to-pink-600",
    "from-amber-400 to-orange-600",
]

// ─── assign tag popover ───────────────────────────────────────────────────────

function AssignTagPopover({ contactId, assignedTagIds }: { contactId: string; assignedTagIds: string[] }) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState("")
    const [newTagName, setNewTagName] = useState("")
    const ref = useRef<HTMLDivElement>(null)
    const qc = useQueryClient()

    const { data: allTagsRaw = [], isLoading: loadingTags } = useTags()
    const allTags = allTagsRaw as Tag[]
    const { mutate: assignTag, isPending: assigning } = useAssignTag()
    const { mutate: createTag, isPending: creating } = useCreateTag()

    useEffect(() => {
        function handler(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        if (open) document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [open])

    const filtered = allTags.filter(
        (t) => !assignedTagIds.includes(t.id) && t.name.toLowerCase().includes(search.toLowerCase())
    )

    function handleAssign(tagId: string) {
        assignTag(
            { contactId, tagId },
            {
                onSuccess: () => {
                    qc.invalidateQueries({ queryKey: queryKeys.contacts.tags(contactId) })
                    toast.success("Tag assigned")
                    setOpen(false)
                },
                onError: () => toast.error("Failed to assign tag"),
            }
        )
    }

    function handleCreate() {
        const name = newTagName.trim()
        if (!name) return
        createTag(name, {
            onSuccess: (tag) => {
                setNewTagName("")
                assignTag(
                    { contactId, tagId: tag.id },
                    {
                        onSuccess: () => {
                            qc.invalidateQueries({ queryKey: queryKeys.contacts.tags(contactId) })
                            toast.success(`Tag "${name}" created & assigned`)
                            setOpen(false)
                        },
                    }
                )
            },
            onError: () => toast.error("Failed to create tag"),
        })
    }

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen((v) => !v)}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium text-zinc-400 border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-violet-400 hover:text-violet-500 transition-colors"
            >
                <Plus size={11} /> Add tag
            </button>

            {open && (
                <div className="absolute left-0 top-full mt-2 w-60 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg z-50 overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
                        <Search size={12} className="text-zinc-400 flex-shrink-0" />
                        <input
                            autoFocus
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search tags…"
                            className="flex-1 text-xs bg-transparent outline-none text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400"
                        />
                    </div>

                    <div className="max-h-44 overflow-y-auto">
                        {loadingTags && (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 size={14} className="animate-spin text-zinc-400" />
                            </div>
                        )}
                        {!loadingTags && filtered.length === 0 && (
                            <p className="text-xs text-zinc-400 text-center py-3">
                                {search ? "No matching tags" : "All tags already assigned"}
                            </p>
                        )}
                        {filtered.map((tag) => (
                            <button
                                key={tag.id}
                                onClick={() => handleAssign(tag.id)}
                                disabled={assigning}
                                className="w-full text-left px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-violet-50 dark:hover:bg-violet-950/30 hover:text-violet-700 dark:hover:text-violet-400 transition-colors flex items-center gap-2"
                            >
                                {assigning ? <Loader2 size={10} className="animate-spin" /> : null}
                                {tag.name}
                            </button>
                        ))}
                    </div>

                    <div className="border-t border-zinc-100 dark:border-zinc-800 p-2">
                        <div className="flex items-center gap-1.5">
                            <input
                                value={newTagName}
                                onChange={(e) => setNewTagName(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                                placeholder="Create new tag…"
                                className="flex-1 text-xs bg-zinc-50 dark:bg-zinc-800 rounded-lg px-2.5 py-1.5 outline-none text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                            />
                            <button
                                onClick={handleCreate}
                                disabled={!newTagName.trim() || creating}
                                className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 disabled:opacity-40 hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors"
                            >
                                {creating ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── tags card ────────────────────────────────────────────────────────────────

function TagsCard({ tagRelations, contact, isLoading, contactId }: { tagRelations: ContactTagRelation[]; contact: ContactDetail; isLoading: boolean; contactId: string }) {
    const qc = useQueryClient()
    const { mutate: removeTag } = useRemoveTag()

    // tagRelations shape: { contactId, tagId, tag: { id, name } }
    // contacts.ts already normalizes this in getContactTags — but the type
    // in api.ts changed to ContactTagRelation[] so we read .tag.name correctly
    const tags: Tag[] = tagRelations.map((r) => r.tag)
    const assignedTagIds = tags.map((t) => t.id)

    return (
        <Section icon={<TagIcon size={14} />} title="Tags & Sources" count={tags.length}>
            {isLoading ? (
                <Skeleton className="h-8 w-full" />
            ) : (
                <>
                    <div className="flex flex-wrap gap-2 min-h-[32px]">
                        {tags.length === 0 && (
                            <p className="text-xs text-zinc-400 self-center">No tags yet.</p>
                        )}
                        {tags.map((tag) => (
                            <button
                                key={tag.id}
                                onClick={() =>
                                    removeTag(
                                        { contactId, tagId: tag.id },
                                        {
                                            onSuccess: () => {
                                                qc.invalidateQueries({ queryKey: queryKeys.contacts.tags(contactId) })
                                                toast.success("Tag removed")
                                            },
                                            onError: () => toast.error("Failed to remove tag"),
                                        }
                                    )
                                }
                                className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800 transition-colors"
                            >
                                {tag.name}
                                <X size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        ))}
                        <AssignTagPopover contactId={contactId} assignedTagIds={assignedTagIds} />
                    </div>

                    {contact.contactEvents && contact.contactEvents.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                            <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-2">Contact Sources</p>
                            <div className="flex flex-wrap gap-2">
                                {contact.contactEvents.map((e: ContactEvent, i: number) => (
                                    <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                                        {e.source}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </Section>
    )
}

// ─── events card ──────────────────────────────────────────────────────────────

function EventsCard({ events, isLoading }: { events: any[]; isLoading: boolean }) {
    return (
        <Section icon={<Calendar size={14} />} title="Events" count={events.length}>
            {isLoading ? (
                <div className="space-y-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
            ) : events.length === 0 ? (
                <EmptyState message="No events for this contact." />
            ) : (
                <div className="space-y-2">
                    {events.map((event) => (
                        <div key={event.id} className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Calendar size={13} className="text-blue-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 leading-snug">{event.title}</p>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <StatusPill status={event.status} />
                                        {event.link && (
                                            <a href={event.link} target="_blank" rel="noreferrer" className="text-zinc-300 hover:text-zinc-600 dark:hover:text-zinc-300">
                                                <ExternalLink size={12} />
                                            </a>
                                        )}
                                    </div>
                                </div>
                                {event.description && (
                                    <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">{event.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[11px] text-zinc-400">{fmtDate(event.createdAt)}</span>
                                    {event.templateType && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-500">
                                            {event.templateType}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Section>
    )
}

// ─── payments card — cursor pagination ───────────────────────────────────────

function PaymentsCard({ contactId }: { contactId: string }) {
    const [cursorStack, setCursorStack] = useState<Array<string | undefined>>([undefined])
    const currentCursor = cursorStack[cursorStack.length - 1]

    const { data, isLoading } = useContactPayments(contactId, { limit: PAGE_SIZE, cursor: currentCursor })

    const items = data?.payments?.items ?? []
    const total = data?.total ?? 0
    const nextCursor = data?.payments?.nextCursor ?? null

    const totalCompleted = items.filter((p) => p.status === "COMPLETED").reduce((s, p) => s + (p.amount ?? 0), 0)

    return (
        <Section icon={<CreditCard size={14} />} title="Payments" count={total}>
            {isLoading ? (
                <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
            ) : items.length === 0 ? (
                <EmptyState message="No payment history." />
            ) : (
                <>
                    {totalCompleted > 0 && cursorStack.length === 1 && (
                        <div className="mb-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
                            <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-wider">Total Collected</p>
                            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">₹{totalCompleted.toLocaleString("en-IN")}</p>
                        </div>
                    )}
                    <div className="space-y-2">
                        {items.map((p) => (
                            <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                                            {p.currency} {(p.amount ?? 0).toLocaleString("en-IN")}
                                        </span>
                                        <StatusPill status={p.status} />
                                    </div>
                                    <p className="text-[11px] text-zinc-400 mt-0.5">{fmtDatetime(p.paidAt ?? p.createdAt)}</p>
                                    {p.failureReason && <p className="text-[11px] text-red-500 mt-0.5">{p.failureReason}</p>}
                                </div>
                                {(p.razorpayPaymentId || p.razorpayOrderId) && (
                                    <span className="text-[10px] font-mono text-zinc-300 truncate max-w-[72px]">
                                        {(p.razorpayPaymentId ?? p.razorpayOrderId ?? "").slice(-8)}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                    <CursorPaginationBar
                        onPrev={() => setCursorStack((prev) => prev.slice(0, -1))}
                        onNext={() => nextCursor && setCursorStack((prev) => [...prev, nextCursor])}
                        hasPrev={cursorStack.length > 1}
                        hasNext={!!nextCursor}
                        showing={items.length}
                        total={total}
                    />
                </>
            )}
        </Section>
    )
}

// ─── messages card — offset pagination ───────────────────────────────────────

function MessagesCard({ contactId }: { contactId: string }) {
    const [page, setPage] = useState(1)
    const { data, isLoading } = useContactMessages(contactId, { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })
    const messages = data?.messages ?? []
    const total = data?.total ?? 0

    return (
        <Section icon={<MessageSquare size={14} />} title="Messages" count={total}>
            {isLoading ? (
                <div className="space-y-2"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
            ) : messages.length === 0 ? (
                <EmptyState message="No messages sent to this contact." />
            ) : (
                <>
                    <div className="space-y-2">
                        {messages.map((msg) => (
                            <div key={msg.id} className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${msg.type === "WHATSAPP" ? "bg-green-100 dark:bg-green-950/40" : "bg-blue-100 dark:bg-blue-950/40"}`}>
                                    <MessageSquare size={12} className={msg.type === "WHATSAPP" ? "text-green-500" : "text-blue-500"} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide">{msg.type}</span>
                                            <span className="text-zinc-300 flex-shrink-0">·</span>
                                            <span className="text-[11px] text-zinc-500 truncate">{msg.template}</span>
                                        </div>
                                        <StatusPill status={msg.status} />
                                    </div>
                                    <p className="text-[11px] text-zinc-400 mt-0.5">{fmtDatetime(msg.sentAt ?? msg.createdAt)}</p>
                                    {msg.errorMessage && <p className="text-[11px] text-red-500 mt-1">{msg.errorMessage}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                    <PaginationBar page={page} total={total} limit={PAGE_SIZE} onPage={setPage} />
                </>
            )}
        </Section>
    )
}

// ─── certificates card — client-side pagination ───────────────────────────────

function CertificatesCard({ contactId }: { contactId: string }) {
    const [page, setPage] = useState(1)
    const { data, isLoading } = useContactCertificates(contactId)
    const all = data?.certificates ?? []
    const total = data?.total ?? all.length
    const paged = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    return (
        <Section icon={<Award size={14} />} title="Certificates" count={total}>
            {isLoading ? (
                <div className="space-y-2"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
            ) : paged.length === 0 ? (
                <EmptyState message="No certificates issued." />
            ) : (
                <>
                    <div className="space-y-2">
                        {paged.map((cert) => (
                            <div key={cert.id} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center flex-shrink-0">
                                    <Award size={13} className="text-amber-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">{cert.event?.title || "Certificate"}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[11px] text-zinc-400">Issued {fmtDate(cert.issuedAt)}</span>
                                        <StatusPill status={cert.status} />
                                    </div>
                                </div>
                                {cert.fileAsset?.url && (
                                    <a href={cert.fileAsset.url} target="_blank" rel="noreferrer" className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">
                                        <Download size={11} /> PDF
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                    <PaginationBar page={page} total={total} limit={PAGE_SIZE} onPage={setPage} />
                </>
            )}
        </Section>
    )
}

// ─── files card — client-side pagination ─────────────────────────────────────

function FilesCard({ contactId }: { contactId: string }) {
    const [page, setPage] = useState(1)
    const { data, isLoading } = useContactFiles(contactId)
    const all = data?.files ?? []
    const total = data?.total ?? all.length
    const paged = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    return (
        <Section icon={<FileText size={14} />} title="Files" count={total}>
            {isLoading ? (
                <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
            ) : paged.length === 0 ? (
                <EmptyState message="No files attached." />
            ) : (
                <>
                    <div className="space-y-2">
                        {paged.map((file) => (
                            <div key={file.id} className="group flex items-center gap-3 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
                                <div className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0">
                                    <FileText size={13} className="text-zinc-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-zinc-700 dark:text-zinc-300 truncate font-medium">{file.name}</p>
                                    <p className="text-[11px] text-zinc-400">{fmtBytes(file.size)} · {fmtDate(file.createdAt)}</p>
                                </div>
                                <a href={file.url} target="_blank" rel="noreferrer" className="flex-shrink-0 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-white dark:hover:bg-zinc-700 transition-colors">
                                    <Download size={13} />
                                </a>
                            </div>
                        ))}
                    </div>
                    <PaginationBar page={page} total={total} limit={PAGE_SIZE} onPage={setPage} />
                </>
            )}
        </Section>
    )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function ContactDetailPage() {
    const router = useRouter()
    const params = useParams()
    const contactId = params.id as string

    const { data: contact, isLoading: isLoadingContact } = useContactDetail(contactId)
    const { data: eventsData, isLoading: isLoadingEvents } = useContactEvents(contactId)
    const { data: tagsData, isLoading: isLoadingTags } = useContactTags(contactId)

    const events = useMemo(() => eventsData?.events ?? [], [eventsData])
    // tagsData.tags is ContactTagRelation[] after normalization in contacts.ts
    const tagRelations = useMemo(() => (tagsData?.tags ?? []) as ContactTagRelation[], [tagsData])

    if (isLoadingContact) {
        return (
            <div className="w-full px-4 py-6 space-y-4">
                <Skeleton className="h-52 w-full rounded-2xl" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <Skeleton className="h-36 rounded-2xl" />
                    <Skeleton className="h-36 rounded-2xl lg:col-span-2" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Skeleton className="h-52 rounded-2xl" />
                    <Skeleton className="h-52 rounded-2xl" />
                    <Skeleton className="h-40 rounded-2xl" />
                    <Skeleton className="h-40 rounded-2xl" />
                </div>
            </div>
        )
    }

    if (!contact) {
        return (
            <div className="w-full px-4 py-6">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-800 mb-6 transition-colors">
                    <ArrowLeft size={15} /> Back
                </button>
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Contact not found.</AlertDescription>
                </Alert>
            </div>
        )
    }

    const avatarGrad = AVATAR_GRADIENTS[(contact.name?.charCodeAt(0) ?? 0) % AVATAR_GRADIENTS.length]

    return (
        <div className="w-full px-4 py-6 space-y-4">

            {/* ── hero ────────────────────────────────────────────────────── */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
                <div className="flex items-start gap-4">
                    <button
                        onClick={() => router.back()}
                        className="mt-1 flex-shrink-0 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                    >
                        <ArrowLeft size={16} />
                    </button>

                    <div className={`flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarGrad} flex items-center justify-center text-white font-bold text-lg shadow-sm`}>
                        {initials(contact.name)}
                    </div>

                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 leading-tight">
                            {contact.name || "Unnamed Contact"}
                        </h1>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                            {contact.email && (
                                <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">
                                    <Mail size={13} />{contact.email}
                                </a>
                            )}
                            {contact.phone && (
                                <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">
                                    <Phone size={13} />{contact.phone}
                                </a>
                            )}
                        </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-2 flex-shrink-0 mt-1">
                        {contact.email && (
                            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => window.open(`mailto:${contact.email}`)}>
                                <Mail size={11} /> Email
                            </Button>
                        )}
                        {contact.phone && (
                            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => window.open(`tel:${contact.phone}`)}>
                                <Phone size={11} /> Call
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-zinc-100 dark:border-zinc-800">
                    <MetaCell label="Created" value={fmtDate(contact.createdAt)} />
                    <MetaCell label="Last Updated" value={fmtDate(contact.updatedAt)} />
                    <MetaCell label="Sources" value={String(contact.contactEvents?.length ?? 0)} />
                    <MetaCell label="Status" value={contact.isDeleted ? "Deleted" : "Active"} />
                </div>
            </div>

            {/* ── row 1 ───────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                <SectionErrorBoundary title="Tags">
                    <TagsCard tagRelations={tagRelations} contact={contact} isLoading={isLoadingTags} contactId={contactId} />
                </SectionErrorBoundary>
                <div className="lg:col-span-2">
                    <SectionErrorBoundary title="Events">
                        <EventsCard events={events} isLoading={isLoadingEvents} />
                    </SectionErrorBoundary>
                </div>
            </div>

            {/* ── row 2 ───────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                <SectionErrorBoundary title="Payments">
                    <PaymentsCard contactId={contactId} />
                </SectionErrorBoundary>
                <SectionErrorBoundary title="Messages">
                    <MessagesCard contactId={contactId} />
                </SectionErrorBoundary>
            </div>

            {/* ── row 3 ───────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                <SectionErrorBoundary title="Certificates">
                    <CertificatesCard contactId={contactId} />
                </SectionErrorBoundary>
                <SectionErrorBoundary title="Files">
                    <FilesCard contactId={contactId} />
                </SectionErrorBoundary>
            </div>

        </div>
    )
}
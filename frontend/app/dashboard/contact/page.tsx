"use client"

import { useState, useRef, useCallback, useMemo, memo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, MessageSquare, Phone, Tag as TagIcon, Mail, User, Download, X, Plus } from "lucide-react"
import { toast } from "sonner"
import { useEvents } from "@/lib/query/hooks/useEvents"
import { useContacts, useTags, useAssignTag, useRemoveTag, useCreateTag } from "@/lib/query/hooks/useContacts"
import type { ContactWithRelations } from "@/lib/api/contacts"

const PAGE_SIZE = 20

/**
 * Sub-component for individual Contact Actions to keep Table clean
 */
const ContactActions = ({ 
    contact, 
    allTags, 
    onAssign, 
    onRemove, 
    onCreateAssign, 
    onCall 
}: any) => {
    const [msg, setMsg] = useState("")
    const [selTag, setSelTag] = useState("")
    const [newTag, setNewTag] = useState("")

    return (
        <div className="flex space-x-2">
            {/* Message Dialog */}
            <Dialog>
                <DialogTrigger asChild>
                    <Button size="sm" variant="outline"><MessageSquare className="h-4 w-4" /></Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Message {contact.name || "Contact"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Textarea placeholder="Type message..." value={msg} onChange={(e) => setMsg(e.target.value)} />
                        <div className="flex gap-2">
                            <Button className="flex-1" onClick={() => { toast.success("Sent!"); setMsg("") }}>Send Email</Button>
                            {contact.phone && <Button variant="outline" className="flex-1">Send SMS</Button>}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Button size="sm" variant="outline" onClick={() => onCall(contact.phone)} disabled={!contact.phone}>
                <Phone className="h-4 w-4" />
            </Button>

            {/* Tags Dialog */}
            <Dialog>
                <DialogTrigger asChild>
                    <Button size="sm" variant="outline"><TagIcon className="h-4 w-4" /></Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Manage Tags</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            {contact.tags?.map((t: any) => (
                                <Badge key={t.id} variant="secondary">
                                    {t.name} <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => onRemove(contact.id, t.id)} />
                                </Badge>
                            ))}
                        </div>
                        <div className="space-y-2">
                            <Label>Assign Existing</Label>
                            <div className="flex gap-2">
                                <Select value={selTag} onValueChange={setSelTag}>
                                    <SelectTrigger className="flex-1"><SelectValue placeholder="Select tag" /></SelectTrigger>
                                    <SelectContent>
                                        {allTags.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Button onClick={() => { onAssign(contact.id, selTag); setSelTag("") }}>Assign</Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>New Tag</Label>
                            <div className="flex gap-2">
                                <Input placeholder="Tag name" value={newTag} onChange={(e) => setNewTag(e.target.value)} />
                                <Button onClick={() => { onCreateAssign(contact.id, newTag); setNewTag("") }}>Create</Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

const ContactTable = memo(({ 
    contacts, 
    isLoading, 
    eventNameMap, 
    allTags, 
    actions, 
    hasNextPage, 
    isFetchingNextPage, 
    onLoadMore 
}: any) => {
    if (isLoading) return <Skeleton className="h-[400px] w-full rounded-xl" />

    return (
        <Card>
            <CardHeader><CardTitle>Contacts ({contacts.length})</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Contact</TableHead>
                            <TableHead>Events</TableHead>
                            <TableHead>Tags</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {contacts.map((contact: ContactWithRelations) => (
                            <TableRow key={contact.id}>
                                <TableCell>
                                    <div className="font-medium">{contact.name || "—"}</div>
                                    <div className="text-xs text-muted-foreground">{contact.email}</div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {contact.contactEvents?.map(ce => (
                                            <Badge key={ce.eventId} variant="outline" className="text-xs">
                                                {eventNameMap[ce.eventId] || "Event"}
                                            </Badge>
                                        ))}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {contact.tags?.map(t => <Badge key={t.id} variant="secondary" className="text-xs">{t.name}</Badge>)}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <ContactActions contact={contact} allTags={allTags} {...actions} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {contacts.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <User className="h-12 w-12 mx-auto mb-2 opacity-20" />
                        <p>No contacts found.</p>
                    </div>
                )}

                {hasNextPage && (
                    <div className="flex justify-center pt-6">
                        <Button variant="outline" onClick={onLoadMore} disabled={isFetchingNextPage}>
                            {isFetchingNextPage ? "Loading..." : "Load More"}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
})
ContactTable.displayName = "ContactTable"

export default function ContactFollowup() {
    const [searchTerm, setSearchTerm] = useState("")
    const [debouncedSearch, setDebouncedSearch] = useState("")
    const [eventFilter, setEventFilter] = useState("all")

    // Search Debounce
    const debounceRef = useRef<any>(null)
    const handleSearchChange = (val: string) => {
        setSearchTerm(val)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => setDebouncedSearch(val), 400)
    }

    // Queries
    const { data: events = [] } = useEvents()
    const { data: allTags = [] } = useTags()
    const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useContacts(debouncedSearch || undefined)

    // Mutations
    const { mutate: assignTag } = useAssignTag()
    const { mutate: removeTag } = useRemoveTag()
    const { mutate: createTag } = useCreateTag()

    // Derived State
    const contacts = useMemo(() => {
        const raw = data?.pages.flatMap(p => p.contacts) ?? []
        return eventFilter === "all" ? raw : raw.filter(c => c.contactEvents?.some(ce => ce.eventId === eventFilter))
    }, [data, eventFilter])

    const eventNameMap = useMemo(() => Object.fromEntries(events.map(e => [e.id, e.title])), [events])

    // Handlers
    const actions = {
        onAssign: (contactId: string, tagId: string) => {
            if (!tagId) return
            assignTag({ contactId, tagId }, { onSuccess: () => toast.success("Assigned") })
        },
        onRemove: (contactId: string, tagId: string) => removeTag({ contactId, tagId }),
        onCreateAssign: (contactId: string, name: string) => {
            if (!name.trim()) return
            createTag(name, {
                onSuccess: (newTag) => assignTag({ contactId, tagId: newTag.id })
            })
        },
        onCall: (phone?: string) => phone ? window.open(`tel:${phone}`) : toast.error("No phone number")
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
                <p className="text-muted-foreground">Manage and communicate with respondents.</p>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search..." value={searchTerm} onChange={(e) => handleSearchChange(e.target.value)} className="pl-10" />
                </div>
                <Select value={eventFilter} onValueChange={setEventFilter}>
                    <SelectTrigger className="w-full md:w-[200px]"><SelectValue placeholder="Filter by event" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Events</SelectItem>
                        {events.map(e => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Button variant="secondary"><Download className="mr-2 h-4 w-4" /> Export</Button>
            </div>

            <ContactTable 
                contacts={contacts}
                isLoading={isLoading} 
                eventNameMap={eventNameMap}
                allTags={allTags}
                actions={actions}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                onLoadMore={fetchNextPage}
            />
        </div>
    )
}
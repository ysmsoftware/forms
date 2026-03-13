"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, MessageSquare, Phone, Tag as TagIcon, Mail, User, Download, X, Plus } from "lucide-react"
import { toast } from "sonner"
import { useEvents } from "@/lib/query/hooks/useEvents"
import { useContacts, useTags, useAssignTag, useRemoveTag, useCreateTag } from "@/lib/query/hooks/useContacts"
import type { ContactWithRelations } from "@/lib/api/contacts"

const PAGE_SIZE = 20

export default function ContactFollowup() {
    const [searchTerm, setSearchTerm] = useState("")
    const [debouncedSearch, setDebouncedSearch] = useState("")
    const [eventFilter, setEventFilter] = useState("all")
    const [selectedContact, setSelectedContact] = useState<ContactWithRelations | null>(null)
    const [messageContent, setMessageContent] = useState("")
    const [tagInput, setTagInput] = useState("")
    const [selectedTagId, setSelectedTagId] = useState("")

    // Debounce search
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const handleSearchChange = (value: string) => {
        setSearchTerm(value)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => setDebouncedSearch(value), 400)
    }

    const { data: eventsData = [] } = useEvents()
    const { data: tagsData = [] } = useTags()
    const {
        data,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useContacts(debouncedSearch || undefined)

    const { mutate: assignTagMutate } = useAssignTag()
    const { mutate: removeTagMutate } = useRemoveTag()
    const { mutate: createTagMutate } = useCreateTag()

    const contacts = data?.pages.flatMap(p => p.contacts) ?? []
    const allTags = tagsData
    const events = eventsData

    const filteredContacts = eventFilter === "all"
        ? contacts
        : contacts.filter((c) => c.contactEvents?.some((ce) => ce.eventId === eventFilter))

    const eventNameMap = Object.fromEntries(events.map((e) => [e.id, e.title]))

    const handleLoadMore = () => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage()
    }

    const handleAssignTag = (contactId: string) => {
        if (!selectedTagId) return
        assignTagMutate(
            { contactId, tagId: selectedTagId },
            {
                onSuccess: () => { toast.success("Tag assigned!"); setSelectedTagId("") },
                onError: (err: any) => toast.error(err.message),
            }
        )
    }

    const handleCreateAndAssignTag = (contactId: string) => {
        const name = tagInput.trim()
        if (!name) return
        createTagMutate(name, {
            onSuccess: (newTag) => {
                assignTagMutate(
                    { contactId, tagId: newTag.id },
                    {
                        onSuccess: () => { toast.success(`Tag "${name}" created and assigned!`); setTagInput("") },
                        onError: (err: any) => toast.error(err.message),
                    }
                )
            },
            onError: (err: any) => toast.error(err.message),
        })
    }

    const handleRemoveTag = (contactId: string, tagId: string) => {
        removeTagMutate(
            { contactId, tagId },
            {
                onSuccess: () => toast.success("Tag removed!"),
                onError: (err: any) => toast.error(err.message),
            }
        )
    }

    const handleSendMessage = () => {
        if (!messageContent.trim()) { toast.error("Please enter a message to send."); return }
        toast.success(`Message sent to ${selectedContact?.name ?? "contact"} successfully.`)
        setMessageContent("")
        setSelectedContact(null)
    }

    const handleCall = (phone?: string) => {
        if (phone) { window.open(`tel:${phone}`) }
        else { toast.error("This contact doesn't have a phone number on file.") }
    }
    if (isLoading) {
        return (
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-96" />
                    </div>
                    <Skeleton className="h-10 w-40" />
                </div>
                <Skeleton className="h-[100px] rounded-xl" />
                <Skeleton className="h-[400px] rounded-xl" />
            </div>
        )
    }

    /* ──────────────────── Rendered page ──────────────────── */
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Contact &amp; Follow-up</h1>
                    <p className="text-muted-foreground">Manage and communicate with all your form respondents.</p>
                </div>
            </div>

            {/* Filters */}

            <div className="flex flex-col xl:flex-row gap-6 xl:items-center">
                {/* Search box */}
                <div className="flex-1">
                    <Input
                        placeholder="Search contacts..."
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {/* Filter by event */}
                <div className="flex-1" >
                    <Select value={eventFilter} onValueChange={setEventFilter}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by event" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Events</SelectItem>
                            {events.map((event) => (
                                <SelectItem key={event.id} value={event.id}>
                                    {event.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>


                {/* Export contacts */}
                <div>
                    <Button>
                        <Download className="mr-2 h-4 w-4" />
                        Export Contacts
                    </Button>
                </div>
            </div>

            {/* Contacts Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Contacts ({filteredContacts.length})</CardTitle>
                </CardHeader>
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
                            {filteredContacts.map((contact) => (
                                <TableRow key={contact.id}>
                                    {/* Contact info */}
                                    <TableCell>
                                        <div className="space-y-1">
                                            <div className="font-medium">{contact.name ?? "—"}</div>
                                            {contact.email && (
                                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                                    <Mail className="h-3 w-3" />
                                                    <span>{contact.email}</span>
                                                </div>
                                            )}
                                            {contact.phone && (
                                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                                    <Phone className="h-3 w-3" />
                                                    <span>{contact.phone}</span>
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>

                                    {/* Events column */}
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {contact.contactEvents && contact.contactEvents.length > 0
                                                ? contact.contactEvents.map((ce) => (
                                                    <Badge key={ce.eventId} variant="outline" className="text-xs">
                                                        {eventNameMap[ce.eventId] ?? ce.eventId.slice(0, 8)}
                                                    </Badge>
                                                ))
                                                : <span className="text-sm text-muted-foreground">—</span>}
                                        </div>
                                    </TableCell>

                                    {/* Tags column */}
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {contact.tags && contact.tags.length > 0
                                                ? contact.tags.map((tag) => (
                                                    <Badge key={tag.id} variant="secondary" className="text-xs">
                                                        {tag.name}
                                                    </Badge>
                                                ))
                                                : <span className="text-sm text-muted-foreground">—</span>}
                                        </div>
                                    </TableCell>

                                    {/* Actions */}
                                    <TableCell>
                                        <div className="flex space-x-2">
                                            {/* Send Message Dialog */}
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setSelectedContact(contact)}
                                                    >
                                                        <MessageSquare className="h-4 w-4" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Send Message to {contact.name ?? "Contact"}</DialogTitle>
                                                        <DialogDescription>
                                                            Send an email or SMS message to this contact.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="space-y-4">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="message">Message</Label>
                                                            <Textarea
                                                                id="message"
                                                                placeholder="Type your message here..."
                                                                value={messageContent}
                                                                onChange={(e) => setMessageContent(e.target.value)}
                                                                rows={4}
                                                            />
                                                        </div>
                                                        <div className="flex space-x-2">
                                                            <Button onClick={handleSendMessage} className="flex-1">
                                                                <Mail className="mr-2 h-4 w-4" />
                                                                Send Email
                                                            </Button>
                                                            {contact.phone && (
                                                                <Button variant="outline" className="flex-1 bg-transparent">
                                                                    <MessageSquare className="mr-2 h-4 w-4" />
                                                                    Send SMS
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>

                                            {/* Phone call */}
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleCall(contact.phone)}
                                                disabled={!contact.phone}
                                            >
                                                <Phone className="h-4 w-4" />
                                            </Button>

                                            {/* Tag Dialog */}
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button size="sm" variant="outline">
                                                        <TagIcon className="h-4 w-4" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Manage Tags for {contact.name ?? "Contact"}</DialogTitle>
                                                        <DialogDescription>
                                                            Assign, create, or remove tags for internal tracking.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="space-y-4">
                                                        {/* Existing tags */}
                                                        <div className="space-y-2">
                                                            <Label>Current Tags</Label>
                                                            <div className="flex flex-wrap gap-2">
                                                                {contact.tags && contact.tags.length > 0 ? (
                                                                    contact.tags.map((tag) => (
                                                                        <Badge
                                                                            key={tag.id}
                                                                            variant="secondary"
                                                                            className="flex items-center gap-1"
                                                                        >
                                                                            {tag.name}
                                                                            <button
                                                                                onClick={() => handleRemoveTag(contact.id, tag.id)}
                                                                                className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                                                                            >
                                                                                <X className="h-3 w-3" />
                                                                            </button>
                                                                        </Badge>
                                                                    ))
                                                                ) : (
                                                                    <span className="text-sm text-muted-foreground">
                                                                        No tags assigned
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Assign existing tag */}
                                                        <div className="space-y-2">
                                                            <Label>Assign Existing Tag</Label>
                                                            <div className="flex space-x-2">
                                                                <Select
                                                                    value={selectedTagId}
                                                                    onValueChange={setSelectedTagId}
                                                                >
                                                                    <SelectTrigger className="flex-1">
                                                                        <SelectValue placeholder="Select a tag" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {allTags.map((t) => (
                                                                            <SelectItem key={t.id} value={t.id}>
                                                                                {t.name}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                                <Button onClick={() => handleAssignTag(contact.id)}>
                                                                    Assign Tag
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        {/* Create & assign new tag */}
                                                        <div className="space-y-2">
                                                            <Label>Create &amp; Assign New Tag</Label>
                                                            <div className="flex space-x-2">
                                                                <Input
                                                                    placeholder="Enter tag name"
                                                                    value={tagInput}
                                                                    onChange={(e) => setTagInput(e.target.value)}
                                                                />
                                                                <Button onClick={() => handleCreateAndAssignTag(contact.id)}>
                                                                    <Plus className="mr-1 h-4 w-4" />
                                                                    Create &amp; Assign
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {/* Empty state */}
                    {filteredContacts.length === 0 && (
                        <div className="text-center py-12">
                            <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                            <h3 className="text-lg font-semibold mb-2">No contacts found</h3>
                            <p className="text-muted-foreground">
                                {searchTerm || eventFilter !== "all"
                                    ? "Try adjusting your filters to see more contacts."
                                    : "Contacts will appear here as people submit your forms."}
                            </p>
                        </div>
                    )}

                    {/* Load More */}
                    {hasNextPage && filteredContacts.length >= PAGE_SIZE && (
                        <div className="flex justify-center pt-6">
                            <Button
                                variant="outline"
                                onClick={handleLoadMore}
                                disabled={isFetchingNextPage}
                            >
                                {isFetchingNextPage ? "Loading..." : "Load More"}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

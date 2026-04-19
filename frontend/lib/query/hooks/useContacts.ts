import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { 
    listContacts,
    getContact,
    getContactEvents,
    getContactCertificates,
    getContactPayments,
    getContactMessages,
    getContactTags,
    getContactFiles,
} from "@/lib/api/contacts"
import { assignTag, removeTag, createTag } from "@/lib/api/tags"
import { queryKeys } from "../keys"
import { listTags } from "@/lib/api/tags"

const PAGE_SIZE = 20

export function useContacts(search?: string) {
    return useInfiniteQuery({
        queryKey: queryKeys.contacts.list({ search }),
        queryFn: ({ pageParam }) =>
            listContacts({ search, lastId: pageParam as string | undefined, take: PAGE_SIZE }),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => {
            const items = lastPage.contacts
            return items.length >= PAGE_SIZE ? items[items.length - 1].id : undefined
        },
    })
}

export function useAssignTag() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ contactId, tagId }: { contactId: string; tagId: string }) =>
            assignTag(contactId, tagId),
        onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.contacts.all }),
    })
}

export function useRemoveTag() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ contactId, tagId }: { contactId: string; tagId: string }) =>
            removeTag(contactId, tagId),
        onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.contacts.all }),
    })
}

export function useCreateTag() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (name: string) => createTag(name),
        onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tags.list() }),
    })
}

export function useTags() {
    return useQuery({
        queryKey: queryKeys.tags.list(),
        queryFn: listTags,
        staleTime: 1000 * 60 * 5, // tags change rarely — cache 5 min
    })
}

// ========== Contact Detail Hooks ==========

export function useContactDetail(id: string) {
    return useQuery({
        queryKey: queryKeys.contacts.detail(id),
        queryFn: () => getContact(id),
        enabled: !!id,
    })
}

export function useContactEvents(id: string) {
    return useQuery({
        queryKey: queryKeys.contacts.events(id),
        queryFn: () => getContactEvents(id),
        enabled: !!id,
    })
}

export function useContactCertificates(id: string) {
    return useQuery({
        queryKey: queryKeys.contacts.certificates(id),
        queryFn: () => getContactCertificates(id),
        enabled: !!id,
    })
}

export function useContactPayments(id: string, params?: { limit?: number; cursor?: string; status?: string }) {
    return useQuery({
        queryKey: queryKeys.contacts.payments(id, params),
        queryFn: () => getContactPayments(id, params),
        enabled: !!id,
    })
}

export function useContactMessages(id: string, params?: { limit?: number; offset?: number }) {
    return useQuery({
        queryKey: queryKeys.contacts.messages(id, params),
        queryFn: () => getContactMessages(id, params),
        enabled: !!id,
    })
}

export function useContactTags(id: string) {
    return useQuery({
        queryKey: queryKeys.contacts.tags(id),
        queryFn: () => getContactTags(id),
        enabled: !!id,
    })
}

export function useContactFiles(id: string) {
    return useQuery({
        queryKey: queryKeys.contacts.files(id),
        queryFn: () => getContactFiles(id),
        enabled: !!id,
    })
}
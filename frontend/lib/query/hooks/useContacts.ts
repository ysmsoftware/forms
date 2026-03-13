import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { listContacts } from "@/lib/api/contacts"
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getEvents, getEventById, createEvent, updateEvent, publishEvent, closeEvent, deleteEvent, duplicateEvent } from "@/lib/api/events"
import { queryKeys } from "../keys"

export function useEvents() {
    return useQuery({
        queryKey: queryKeys.events.list(),
        queryFn: getEvents,
    })
}

export function useEvent(id: string) {
    return useQuery({
        queryKey: queryKeys.events.detail(id),
        queryFn: () => getEventById(id),
        enabled: !!id,
    })
}

export function useCreateEvent() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: createEvent,
        onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.events.list() }),
    })
}

export function useUpdateEvent(id: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (payload: Parameters<typeof updateEvent>[1]) => updateEvent(id, payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.events.detail(id) })
            qc.invalidateQueries({ queryKey: queryKeys.events.list() })
        },
    })
}

export function usePublishEvent(id: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: () => publishEvent(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.events.detail(id) })
            qc.invalidateQueries({ queryKey: queryKeys.events.list() })
        },
    })
}

export function useCloseEvent(id: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: () => closeEvent(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.events.detail(id) })
            qc.invalidateQueries({ queryKey: queryKeys.events.list() })
        },
    })
}

export function useDeleteEvent() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => deleteEvent(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.events.list() }),
    })
}

export function useDuplicateEvent() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => duplicateEvent(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.events.list() }),
    })
}
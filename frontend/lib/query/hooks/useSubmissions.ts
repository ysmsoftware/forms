import { useQuery } from "@tanstack/react-query"
import { getSubmissionsByEvent, getSubmissionById } from "@/lib/api/submissions"
import { queryKeys } from "../keys"

export function useSubmissionsByEvent(
    eventId: string,
    params?: { limit?: number; offset?: number; status?: string; page?: number }
) {
    const limit = params?.limit ?? 20
    const offset = params?.offset ?? ((params?.page ?? 1) - 1) * limit
    
    return useQuery({
        queryKey: [...queryKeys.submissions.byEvent(eventId), { ...params, limit, offset }],
        queryFn: () => getSubmissionsByEvent(eventId, { ...params, limit, offset }),
        enabled: !!eventId,
        staleTime: 30_000,
        placeholderData: (previousData) => previousData,
    })
}

/**
 * Fetches ALL submissions for an event (large limit) so we can extract
 * the complete set of submitter contact IDs — independent of the paginated table.
 */
export function useAllSubmitterContactIds(eventId: string) {
    return useQuery({
        queryKey: [...queryKeys.submissions.byEvent(eventId), "all-contact-ids"],
        queryFn: async () => {
            const result = await getSubmissionsByEvent(eventId, { limit: 10000, offset: 0, status: "ALL" })
            const contactIds = result.items
                .filter(s => !!s.contact?.id)
                .map(s => s.contact!.id)
                .filter((cid, idx, arr) => arr.indexOf(cid) === idx) // deduplicate
            return contactIds
        },
        enabled: !!eventId,
        staleTime: 60_000,
    })
}

export function useSubmission(id: string) {
    return useQuery({
        queryKey: queryKeys.submissions.detail(id),
        queryFn: () => getSubmissionById(id),
        enabled: !!id,
    })
}

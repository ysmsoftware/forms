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

export function useSubmission(id: string) {
    return useQuery({
        queryKey: queryKeys.submissions.detail(id),
        queryFn: () => getSubmissionById(id),
        enabled: !!id,
    })
}

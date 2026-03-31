import { useQuery } from "@tanstack/react-query"
import { getSubmissionsByEvent, getSubmissionById } from "@/lib/api/submissions"
import { queryKeys } from "../keys"

export function useSubmissionsByEvent(
    eventId: string,
    params?: { limit?: number; offset?: number; status?: string }
) {
    return useQuery({
        queryKey: [...queryKeys.submissions.byEvent(eventId), params],
        queryFn: () => getSubmissionsByEvent(eventId, params),
        enabled: !!eventId,
        staleTime: 30_000,
    })
}

export function useSubmission(id: string) {
    return useQuery({
        queryKey: queryKeys.submissions.detail(id),
        queryFn: () => getSubmissionById(id),
        enabled: !!id,
    })
}

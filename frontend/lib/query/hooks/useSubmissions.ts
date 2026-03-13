import { useQuery } from "@tanstack/react-query"
import { getSubmissionsByEvent, getSubmissionById } from "@/lib/api/submissions"
import { queryKeys } from "../keys"

export function useSubmissionsByEvent(eventId: string) {
    return useQuery({
        queryKey: queryKeys.submissions.byEvent(eventId),
        queryFn: () => getSubmissionsByEvent(eventId),
        enabled: !!eventId,
    })
}

export function useSubmission(id: string) {
    return useQuery({
        queryKey: queryKeys.submissions.detail(id),
        queryFn: () => getSubmissionById(id),
        enabled: !!id,
    })
}

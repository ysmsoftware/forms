import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getMe, updateMe } from "@/lib/api/auth"
import { queryKeys } from "../keys"

export function useMe() {
    return useQuery({
        queryKey: queryKeys.user.me,
        queryFn: getMe,
        staleTime: 1000 * 60 * 10,
        retry: false,               // 401 = session dead → don't retry
        refetchOnWindowFocus: false, // no background refetches that re-trigger 401s
    })
}

export function useUpdateMe() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: updateMe,
        onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.user.me }),
    })
}
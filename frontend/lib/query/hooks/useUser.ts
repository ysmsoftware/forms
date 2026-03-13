import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getMe, updateMe } from "@/lib/api/auth"
import { queryKeys } from "../keys"

export function useMe() {
    return useQuery({
        queryKey: queryKeys.user.me,
        queryFn: getMe,
        staleTime: 1000 * 60 * 10, // user profile barely changes — cache 10 min
    })
}

export function useUpdateMe() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: updateMe,
        onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.user.me }),
    })
}
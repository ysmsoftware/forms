import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { getMessages, sendMessage, resolveMessageParams, GetMessagesParams, SendMessageInput } from "@/lib/api/messages";

export function useMessages(
    params?: GetMessagesParams,
    options?: { refetchInterval?: number | false | ((query: any) => number | false) }
) {
    return useQuery({
        queryKey: queryKeys.messages.list(params),
        queryFn: () => getMessages(params),
        ...options,
    });
}

export function useSendMessage() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: SendMessageInput) => sendMessage(input),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.messages.all });
        },
    });
}

export function useResolveParams(
    input: { contactId: string; eventId?: string; template: string } | null
) {
    return useQuery({
        queryKey: ["messages", "resolve-params", input],
        queryFn: () => resolveMessageParams(input!),
        enabled: !!input && !!input.contactId && !!input.template,
        staleTime: 30_000,          // 30s — params for a given contact+event+template don't change fast
        retry: false,               // don't retry on validation errors
    })
}
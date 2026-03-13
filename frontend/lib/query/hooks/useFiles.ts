import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../keys";
import {
    uploadFileAdmin,
    uploadFilePublic,
    deleteFileAdmin,
    getFilesByEvent,
    UploadFileInput,
} from "@/lib/api/files";

export function useUploadFileAdmin() {
    return useMutation({
        mutationFn: (input: UploadFileInput) => uploadFileAdmin(input),
        // Do not auto-invalidate here because caller decides what to do with the URL (e.g., attach to event)
    });
}

export function useUploadFilePublic() {
    return useMutation({
        mutationFn: (input: UploadFileInput) => uploadFilePublic(input),
        // Eager upload, caller uses the URL for form submission
    });
}

export function useDeleteFile() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteFileAdmin(id),
        onSuccess: (_, variables, context) => {
            // Ideally invalidate by eventId if known, but we don't have it in the mutation input directly
            // You can optionally pass eventId in a custom mutate function wrapper or invalidate all files
            qc.invalidateQueries({ queryKey: queryKeys.files.all });
        },
    });
}

export function useFilesByEvent(eventId: string, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: queryKeys.files.byEvent(eventId),
        queryFn: () => getFilesByEvent(eventId),
        enabled: !!eventId && options?.enabled !== false,
    });
}

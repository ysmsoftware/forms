import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "../keys"
import {
    issueCertificate,
    issueCertificateBulk,
    getCertificatesByEvent,
    verifyCertificate,
} from "@/lib/api/certificate"

/**
 * Issue a certificate for a single submission.
 * On success, invalidates the certificate list for the event so the table
 * reflects the new QUEUED status immediately.
 */
export function useIssueCertificate(eventId?: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (param: string | { submissionId: string; paramOverrides?: Record<string, string> }) => {
            if (typeof param === "string") {
                return issueCertificate(param)
            }
            return issueCertificate(param.submissionId, param.paramOverrides)
        },
        onSuccess: () => {
            if (eventId) {
                qc.invalidateQueries({ queryKey: queryKeys.certificates.byEvent(eventId) })
            }
        },
    })
}

/**
 * Issue certificates in bulk for an entire event's submissions.
 * On success, invalidates the certificate list so statuses refresh.
 */
export function useIssueCertificateBulk(eventId?: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (submissionIds: string[]) => issueCertificateBulk(submissionIds),
        onSuccess: () => {
            if (eventId) {
                qc.invalidateQueries({ queryKey: queryKeys.certificates.byEvent(eventId) })
            }
        },
    })
}

/**
 * Fetch all certificates for an event.
 * Returns [] while loading so callers never need to null-check.
 */
export function useCertificatesByEvent(
    eventId: string,
    options?: { enabled?: boolean }
) {
    return useQuery({
        queryKey: queryKeys.certificates.byEvent(eventId),
        queryFn: () => getCertificatesByEvent(eventId),
        enabled: !!eventId && options?.enabled !== false,
    })
}

/**
 * Verify a certificate by ID — public, no auth required.
 * Used on the /certificates/verify public page.
 * Keeps stale data for 10 min to avoid hammering the endpoint on QR scans.
 */
export function useVerifyCertificate(
    certificateId: string,
    options?: { enabled?: boolean }
) {
    return useQuery({
        queryKey: queryKeys.certificates.verify(certificateId),
        queryFn: () => verifyCertificate(certificateId),
        enabled: !!certificateId && options?.enabled !== false,
        staleTime: 10 * 60 * 1000, // 10 min — cert status rarely changes after GENERATED
        retry: false,              // Don't retry 404s (invalid cert ID)
    })
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "../keys"
import {
    getAllCertificates,
    type CertificateFilters,
    type CertificateListResult,
    issueCertificate,
    issueCertificateBulk,
    getCertificatesByEvent,
    verifyCertificate,
    resolveParamsForTemplate,
    issueDirectCertificate,
    type CertificateTemplateType,
    type ResolveParamsForTemplateResult,
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
 * Fetch certificates for an event with pagination support.
 * Supports page and limit parameters for pagination.
 */
export function useCertificatesByEvent(
    eventId: string,
    options?: { page?: number; limit?: number; enabled?: boolean }
) {
    return useQuery({
        queryKey: queryKeys.certificates.byEvent(eventId, options?.page, options?.limit),
        queryFn: () => getCertificatesByEvent(eventId, options?.page, options?.limit),
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

export function useResolveParamsForTemplate(
  contactId: string | null,
  templateType: CertificateTemplateType | null
) {
  return useQuery({
    queryKey: ["certificates", "resolveTemplate", contactId, templateType],
    queryFn: () => resolveParamsForTemplate(contactId!, templateType!),
    enabled: !!contactId && !!templateType,
    staleTime: 30_000,
  })
}

export function useIssueDirectCertificate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: issueDirectCertificate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["certificates"] as any })
    },
  })
}

export function useAllCertificates(filters: CertificateFilters = {}) {
  return useQuery({
    queryKey: queryKeys.certificates.list(filters),
    queryFn:  () => getAllCertificates(filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,  // keeps previous data while new page loads
  })
}

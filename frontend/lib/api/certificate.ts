import { apiClient, publicClient } from "./client";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CertificateStatus = "QUEUED" | "PROCESSING" | "GENERATED" | "FAILED"
export type CertificateTemplateType =
    | "ACHIEVEMENT"
    | "APPOINTMENT"
    | "COMPLETION"
    | "INTERNSHIP"
    | "WORKSHOP"

export interface CertificateListItem {
    id: string
    submissionId: string | null
    status: CertificateStatus
    templateType: CertificateTemplateType
    issuedAt: string | null
    event: { id: string; title: string } | null
    contact: { id: string; name: string | null; email: string | null } | null
    fileUrl: string | null
    fileName: string | null
}

export interface CertificateListResult {
    items: CertificateListItem[]
    total: number
    page: number
    limit: number
    totalPages: number
}

export interface CertificateFilters {
    eventId?: string
    status?: CertificateStatus
    templateType?: CertificateTemplateType
    contactName?: string
    dateFrom?: string
    dateTo?: string
    page?: number
    limit?: number
}

export interface CertificateByEventResult {
    items: CertificateItem[]
    total: number
    page: number
    limit: number
    totalPages: number
}

export interface CertificateItem {
    id: string
    submissionId: string
    status: CertificateStatus
    templateType: CertificateTemplateType
    issuedAt: string | null
    contact: {
        id: string
        name: string | null
        email: string | null
    } | null
    fileUrl: string | null
    fileName: string | null
}

export interface IssueCertificateResult {
    message: string
    data: {
        id: string
        submissionId: string
        status: CertificateStatus
        templateType: CertificateTemplateType
    }
}

export interface BulkIssueCertificateResult {
    message: string
    summary: {
        total: number
        queued: number
        failed: number
    }
    results: Array<{
        submissionId: string
        success: boolean
        data?: { id: string; status: CertificateStatus }
        error?: string
    }>
}

export interface VerifyCertificateResult {
    valid: boolean
    status: CertificateStatus
    issuedTo: string | null
    email: string | null
    event: string
    issuedAt: string | null
}

export interface ResolveParamsForTemplateResult {
    resolved: Record<string, string>
    missing: string[]
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function getAllCertificates(
    filters: CertificateFilters = {}
): Promise<CertificateListResult> {
    const params = new URLSearchParams()
    if (filters.eventId)      params.set("eventId",      filters.eventId)
    if (filters.status)       params.set("status",        filters.status)
    if (filters.templateType) params.set("templateType",  filters.templateType)
    if (filters.contactName)  params.set("contactName",   filters.contactName)
    if (filters.dateFrom)     params.set("dateFrom",      filters.dateFrom)
    if (filters.dateTo)       params.set("dateTo",        filters.dateTo)
    if (filters.page)         params.set("page",          String(filters.page))
    if (filters.limit)        params.set("limit",         String(filters.limit))
    const qs = params.toString()
    return apiClient<CertificateListResult>(`/certificates${qs ? `?${qs}` : ""}`)
}

export async function issueCertificate(
    submissionId: string,
    paramOverrides?: Record<string, string>
): Promise<IssueCertificateResult> {
    return apiClient<IssueCertificateResult>(`/certificates/generate`, {
        method: "POST",
        body: JSON.stringify({ submissionId, paramOverrides }),
    })
}

export async function issueCertificateBulk(
    submissionIds: string[]
): Promise<BulkIssueCertificateResult> {
    return apiClient<BulkIssueCertificateResult>(`/certificates/generate`, {
        method: "POST",
        body: JSON.stringify({ submissionIds }),
    })
}

export async function getCertificatesByEvent(
    eventId: string,
    page?: number,
    limit?: number
): Promise<CertificateByEventResult> {
    const params = new URLSearchParams();
    if (page)  params.set("page",  String(page));
    if (limit) params.set("limit", String(limit));
    const qs = params.toString();
    return apiClient<CertificateByEventResult>(
        `/certificates/event/${eventId}${qs ? `?${qs}` : ""}`
    )
}

// Public — no auth required (QR code scan)
export async function verifyCertificate(
    certificateId: string
): Promise<VerifyCertificateResult> {
    return publicClient<VerifyCertificateResult>(
        `/certificates/verify?certificateId=${encodeURIComponent(certificateId)}`
    )
}

export async function resolveCertificateParams(
    submissionId: string
): Promise<{ resolved: Record<string, string>; missing: string[] }> {
    return apiClient(`/certificates/resolve-params`, {
        method: "POST",
        body: JSON.stringify({ submissionId }),
    })
}

export async function resolveParamsForTemplate(
    contactId: string,
    templateType: CertificateTemplateType
): Promise<ResolveParamsForTemplateResult> {
    return apiClient<ResolveParamsForTemplateResult>(`/certificates/resolve-params-template`, {
        method: "POST",
        body: JSON.stringify({ contactId, templateType }),
    })
}

export async function issueDirectCertificate(input: {
    contactId: string
    templateType: CertificateTemplateType
    paramOverrides: Record<string, string>
}): Promise<{ id: string; status: string }> {
    return apiClient<{ id: string; status: string }>(`/certificates/issue-direct`, {
        method: "POST",
        body: JSON.stringify(input),
    })
}
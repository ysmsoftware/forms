// ─── Types ───────────────────────────────────────────────────────────────────

export type CertificateStatus = "QUEUED" | "PROCESSING" | "GENERATED" | "FAILED"
export type CertificateTemplateType =
    | "ACHIEVEMENT"
    | "APPOINTMENT"
    | "COMPLETION"
    | "INTERNSHIP"
    | "WORKSHOP"
    | "WORKSHOP"

/** Extended item that includes event info (from the global list endpoint) */
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
  dateFrom?: string    // ISO date string
  dateTo?: string      // ISO date string
  page?: number
  limit?: number
}

/** Shape returned by GET /api/certificates/event/:eventId */
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

/** Shape returned by POST /api/certificates/generate (single) */
export interface IssueCertificateResult {
    message: string
    data: {
        id: string
        submissionId: string
        status: CertificateStatus
        templateType: CertificateTemplateType
    }
}

/** Shape returned by POST /api/certificates/generate (bulk) */
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

/** Shape returned by GET /api/certificates/verify?certificateId= (public) */
export interface VerifyCertificateResult {
    valid: boolean
    status: CertificateStatus
    issuedTo: string | null
    email: string | null
    event: string
    issuedAt: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api"

function authHeaders(): Record<string, string> {
    const token =
        typeof window !== "undefined" ? localStorage.getItem("accessToken") : null
    return token ? { Authorization: `Bearer ${token}` } : {}
}

async function handleResponse<T>(res: Response, fallback: string): Promise<T> {
    if (!res.ok) {
        let msg = fallback
        try {
            const body = await res.json()
            msg = body.message || msg
        } catch {
            // ignore JSON parse error
        }
        throw new Error(msg)
    }
    return res.json()
}

// ─── API functions ────────────────────────────────────────────────────────────

/**
 * Fetch all certificates with optional filters.
 * GET /api/certificates?eventId=...&status=...&page=...
 */
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
  const res = await fetch(`${BASE_URL}/certificates${qs ? `?${qs}` : ""}`, {
    headers: { "Content-Type": "application/json", ...authHeaders() },
  })
  const json = await handleResponse<{ success: boolean; data: CertificateListResult }>(
    res, "Failed to fetch certificates"
  )
  return json.data
}

/**
 * Issue a certificate for a single submission.
 * POST /api/certificates/generate  { submissionId }
 * Returns 202 — certificate is queued for async generation.
 */
export async function issueCertificate(
    submissionId: string,
    paramOverrides?: Record<string, string>
): Promise<IssueCertificateResult> {
    const res = await fetch(`${BASE_URL}/certificates/generate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
        },
        body: JSON.stringify({ submissionId, paramOverrides }),
    })
    return handleResponse<IssueCertificateResult>(res, "Failed to issue certificate")
}

/**
 * Issue certificates in bulk for multiple submissions.
 * POST /api/certificates/generate  { submissionIds: string[] }
 * Returns 202 — all certificates are queued for async generation.
 */
export async function issueCertificateBulk(
    submissionIds: string[]
): Promise<BulkIssueCertificateResult> {
    const res = await fetch(`${BASE_URL}/certificates/generate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
        },
        body: JSON.stringify({ submissionIds }),
    })
    return handleResponse<BulkIssueCertificateResult>(
        res,
        "Failed to issue certificates in bulk"
    )
}

/**
 * Fetch certificates for an event with pagination.
 * GET /api/certificates/event/:eventId?page=...&limit=...  [auth]
 */
export async function getCertificatesByEvent(
    eventId: string,
    page?: number,
    limit?: number
): Promise<CertificateByEventResult> {
    const params = new URLSearchParams();
    if (page) params.set("page", String(page));
    if (limit) params.set("limit", String(limit));

    const qs = params.toString();
    const res = await fetch(`${BASE_URL}/certificates/event/${eventId}${qs ? `?${qs}` : ""}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
        },
    })
    const json = await handleResponse<{ success: boolean; data: CertificateByEventResult }>(
        res,
        "Failed to fetch certificates"
    )
    return json.data
}

/**
 * Verify a certificate by its ID — public, no auth required.
 * GET /api/certificates/verify?certificateId=xxx
 */
export async function verifyCertificate(
    certificateId: string
): Promise<VerifyCertificateResult> {
    const res = await fetch(
        `${BASE_URL}/certificates/verify?certificateId=${encodeURIComponent(certificateId)}`
    )
    const json = await handleResponse<{ success: boolean; data: VerifyCertificateResult }>(
        res,
        "Certificate not found"
    )
    return json.data
}

/**
 * Resolve missing template parameters for a certificate
 * POST /api/certificates/resolve-params
 */
export async function resolveCertificateParams(
    submissionId: string
): Promise<{
    resolved: Record<string, string>
    missing: string[]
}> {
    const res = await fetch(`${BASE_URL}/certificates/resolve-params`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
        },
        body: JSON.stringify({ submissionId }),
    })
    const json = await handleResponse<{
        success: boolean
        data: { resolved: Record<string, string>; missing: string[] }
    }>(res, "Failed to resolve params")
    return json.data
}

// ─── Direct Issue (no submission required) ────────────────────────────────

export interface ResolveParamsForTemplateResult {
  resolved: Record<string, string>
  missing: string[]
}

export async function resolveParamsForTemplate(
  contactId: string,
  templateType: CertificateTemplateType
): Promise<ResolveParamsForTemplateResult> {
  const res = await fetch(`${BASE_URL}/certificates/resolve-params-template`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ contactId, templateType }),
  })
  const json = await handleResponse<{ success: boolean; data: ResolveParamsForTemplateResult }>(
    res, "Failed to resolve params"
  )
  return json.data
}

export async function issueDirectCertificate(input: {
  contactId: string
  templateType: CertificateTemplateType
  paramOverrides: Record<string, string>
}): Promise<{ id: string; status: string }> {
  const res = await fetch(`${BASE_URL}/certificates/issue-direct`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(input),
  })
  const json = await handleResponse<{ message: string; data: { id: string; status: string } }>(
    res, "Failed to issue certificate"
  )
  return json.data
}


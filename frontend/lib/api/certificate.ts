// ─── Types ───────────────────────────────────────────────────────────────────

export type CertificateStatus = "QUEUED" | "PROCESSING" | "GENERATED" | "FAILED"
export type CertificateTemplateType =
    | "ACHIEVEMENT"
    | "APPOINTMENT"
    | "COMPLETION"
    | "INTERNSHIP"
    | "WORKSHOP"

/** Shape returned by GET /api/certificates/event/:eventId */
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

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3005/api"

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
 * Issue a certificate for a single submission.
 * POST /api/certificates/generate  { submissionId }
 * Returns 202 — certificate is queued for async generation.
 */
export async function issueCertificate(
    submissionId: string
): Promise<IssueCertificateResult> {
    const res = await fetch(`${BASE_URL}/certificates/generate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
        },
        body: JSON.stringify({ submissionId }),
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
 * Fetch all certificates issued for an event.
 * GET /api/certificates/event/:eventId  [auth]
 */
export async function getCertificatesByEvent(
    eventId: string
): Promise<CertificateItem[]> {
    const res = await fetch(`${BASE_URL}/certificates/event/${eventId}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
        },
    })
    const json = await handleResponse<{ success: boolean; data: CertificateItem[] }>(
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

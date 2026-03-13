"use client"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useVerifyCertificate } from "@/lib/query/hooks/useCertificate"
import { CheckCircle2, XCircle, Loader2, Award, Calendar, User, Mail } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

// ─── Inner component — uses useSearchParams so needs Suspense boundary ───────

function VerifyContent() {
    const searchParams = useSearchParams()
    const certificateId = searchParams.get("certificateId") ?? ""

    const { data, isLoading, isError, error } = useVerifyCertificate(certificateId, {
        enabled: !!certificateId,
    })

    // ── No certificateId in URL ────────────────────────────────────────────
    if (!certificateId) {
        return (
            <StatusCard
                icon={<XCircle className="h-12 w-12 text-destructive" />}
                title="Invalid Link"
                description="No certificate ID was provided in this URL. Please scan the QR code on the certificate again."
                badge={<Badge variant="destructive">Invalid</Badge>}
            />
        )
    }

    // ── Loading ────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <StatusCard
                icon={<Loader2 className="h-12 w-12 text-muted-foreground animate-spin" />}
                title="Verifying certificate…"
                description="Please wait while we look up this certificate."
            />
        )
    }

    // ── Error / not found ──────────────────────────────────────────────────
    if (isError || !data) {
        return (
            <StatusCard
                icon={<XCircle className="h-12 w-12 text-destructive" />}
                title="Certificate Not Found"
                description="We could not find a certificate matching this ID. It may have been revoked or the link may be incorrect."
                badge={<Badge variant="destructive">Not Found</Badge>}
            />
        )
    }

    // ── Still processing / queued ──────────────────────────────────────────
    if (!data.valid) {
        return (
            <StatusCard
                icon={<Loader2 className="h-12 w-12 text-yellow-500" />}
                title="Certificate Pending"
                description="This certificate is still being generated. Please check back in a few moments."
                badge={<Badge variant="secondary">{data.status}</Badge>}
            />
        )
    }

    // ── Valid & Generated ──────────────────────────────────────────────────
    return (
        <div className="w-full max-w-lg mx-auto space-y-6">
            {/* Status header */}
            <div className="flex flex-col items-center text-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-green-700">Valid Certificate</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        This certificate has been verified as authentic
                    </p>
                </div>
                <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
                    ✓ Authentic
                </Badge>
            </div>

            {/* Certificate details */}
            <Card>
                <CardContent className="pt-6 space-y-4">
                    <DetailRow
                        icon={<Award className="h-4 w-4 text-muted-foreground" />}
                        label="Event"
                        value={data.event}
                    />
                    {data.issuedTo && (
                        <DetailRow
                            icon={<User className="h-4 w-4 text-muted-foreground" />}
                            label="Issued To"
                            value={data.issuedTo}
                        />
                    )}
                    {data.email && (
                        <DetailRow
                            icon={<Mail className="h-4 w-4 text-muted-foreground" />}
                            label="Email"
                            value={data.email}
                        />
                    )}
                    {data.issuedAt && (
                        <DetailRow
                            icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
                            label="Issued On"
                            value={format(new Date(data.issuedAt), "MMMM dd, yyyy")}
                        />
                    )}
                    <DetailRow
                        icon={<Award className="h-4 w-4 text-muted-foreground" />}
                        label="Certificate ID"
                        value={
                            <span className="font-mono text-xs text-muted-foreground break-all">
                                {certificateId}
                            </span>
                        }
                    />
                </CardContent>
            </Card>

            <p className="text-center text-xs text-muted-foreground">
                Verified by YSM Infosolution · Certificate authenticity is guaranteed
            </p>
        </div>
    )
}

// ─── Shared UI helpers ────────────────────────────────────────────────────────

function StatusCard({
    icon,
    title,
    description,
    badge,
}: {
    icon: React.ReactNode
    title: string
    description: string
    badge?: React.ReactNode
}) {
    return (
        <div className="w-full max-w-lg mx-auto">
            <Card>
                <CardContent className="pt-10 pb-10 flex flex-col items-center text-center gap-4">
                    {icon}
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold">{title}</h1>
                        <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
                    </div>
                    {badge}
                </CardContent>
            </Card>
        </div>
    )
}

function DetailRow({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode
    label: string
    value: React.ReactNode
}) {
    return (
        <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0">{icon}</div>
            <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-medium">{value}</p>
            </div>
        </div>
    )
}

// ─── Page — wraps in Suspense for useSearchParams ─────────────────────────────

export default function VerifyCertificatePage() {

    const [queryClient] = useState(() => new QueryClient())

    return (
        <QueryClientProvider client={queryClient}>
            <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-6">
                {/* Branding */}
                <div className="flex items-center gap-2 mb-10">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <Award className="h-4 w-4" />
                    </div>
                    <span className="font-semibold text-lg">YSM Infosolution</span>
                </div>

                <Suspense
                    fallback={
                        <StatusCard
                            icon={<Loader2 className="h-12 w-12 text-muted-foreground animate-spin" />}
                            title="Loading…"
                            description="Please wait."
                        />
                    }
                >
                    <VerifyContent />
                </Suspense>
            </div>
        </QueryClientProvider>
    )
}

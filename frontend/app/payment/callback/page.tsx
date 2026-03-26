"use client"

import { useEffect, useState, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react"
import { verifyPayment, getPaymentStatus } from "@/lib/api/payments"
import Link from "next/link"

type CallbackState = "verifying" | "polling" | "success" | "failed" | "error"

function PaymentCallbackContent() {
    const searchParams = useSearchParams()
    const [state, setState] = useState<CallbackState>("verifying")
    const [message, setMessage] = useState("")
    const [returnUrl, setReturnUrl] = useState<string | null>(null)
    const processedRef = useRef(false)

    useEffect(() => {
        if (processedRef.current) return
        processedRef.current = true

        const razorpayOrderId = searchParams.get("razorpay_order_id")
        const razorpayPaymentId = searchParams.get("razorpay_payment_id")
        const razorpaySignature = searchParams.get("razorpay_signature")
        const errorCode = searchParams.get("error[code]") ?? searchParams.get("error%5Bcode%5D")
        const errorDescription = searchParams.get("error[description]") ?? searchParams.get("error%5Bdescription%5D")
        // We embed the paymentId (our DB UUID) and returnUrl in the callback_url
        const paymentId = searchParams.get("paymentId")
        const returnPath = searchParams.get("returnUrl")

        // searchParams.get() already decodes the value once.
        // As a safety net, if the value still looks encoded, decode once more.
        if (returnPath) {
            try {
                const decoded = returnPath.includes("%3A") || returnPath.includes("%2F")
                    ? decodeURIComponent(returnPath)
                    : returnPath
                setReturnUrl(decoded)
            } catch {
                setReturnUrl(returnPath)
            }
        }

        // Payment failed at Razorpay level
        if (errorCode || (!razorpaySignature && !razorpayPaymentId)) {
            setState("failed")
            setMessage(errorDescription ?? "Payment was not completed.")
            return
        }

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            setState("error")
            setMessage("Invalid callback parameters.")
            return
        }

        // Verify signature then poll
        const run = async () => {
            try {
                await verifyPayment({ razorpayOrderId, razorpayPaymentId, razorpaySignature })
            } catch {
                // Verification network error — still poll, webhook may have already confirmed
            }

            if (!paymentId) {
                // No paymentId in callback — can't poll, trust verification
                setState("success")
                return
            }

            setState("polling")

            // Poll for up to 30s
            let attempts = 0
            const maxAttempts = 10
            const interval = setInterval(async () => {
                attempts++
                try {
                    const result = await getPaymentStatus(paymentId)
                    // result is already unwrapped by publicClient — access directly
                    const status = result.payment.status

                    if (status === "SUCCESS") {
                        clearInterval(interval)
                        setState("success")
                        return
                    }
                    if (status === "FAILED" || status === "CANCELLED") {
                        clearInterval(interval)
                        setState("failed")
                        setMessage(result.payment.failureReason ?? "Payment was not successful.")
                        return
                    }
                    if (attempts >= maxAttempts) {
                        clearInterval(interval)
                        // Timeout — payment likely succeeded, webhook will confirm
                        setState("success")
                    }
                } catch {
                    if (attempts >= maxAttempts) {
                        clearInterval(interval)
                        setState("success") // optimistic on timeout
                    }
                }
            }, 3000)
        }

        run()
    }, [searchParams])

    if (state === "verifying" || state === "polling") {
        return (
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 text-primary animate-spin" />
                    </div>
                    <CardTitle>Confirming Payment</CardTitle>
                    <CardDescription>
                        {state === "verifying"
                            ? "Verifying your payment..."
                            : "Confirming with bank, please wait..."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                    <p className="text-xs text-muted-foreground">Do not close this page.</p>
                </CardContent>
            </Card>
        )
    }

    if (state === "success") {
        return (
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <CardTitle>Payment Successful!</CardTitle>
                    <CardDescription>Your registration is confirmed.</CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <p className="text-sm text-muted-foreground">
                        You will receive a confirmation from YSM Infosolutions shortly.
                    </p>
                    {returnUrl && (
                        <Button asChild className="w-full">
                            <Link href={returnUrl}>Back to Event</Link>
                        </Button>
                    )}
                </CardContent>
            </Card>
        )
    }

    if (state === "failed") {
        return (
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                        <XCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <CardTitle>Payment Failed</CardTitle>
                    <CardDescription>{message || "Your payment could not be completed."}</CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Your registration is saved. You can retry payment from the form page.
                    </p>
                    {returnUrl && (
                        <Button asChild variant="outline" className="w-full">
                            <Link href={returnUrl}>Return & Retry</Link>
                        </Button>
                    )}
                </CardContent>
            </Card>
        )
    }

    // error state
    return (
        <Card className="w-full max-w-md">
            <CardHeader className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-yellow-600" />
                </div>
                <CardTitle>Something went wrong</CardTitle>
                <CardDescription>We couldn't process the payment callback.</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
                <p className="text-sm text-muted-foreground text-xs">{message}</p>
                {returnUrl && (
                    <Button asChild variant="outline" className="w-full">
                        <Link href={returnUrl}>Go Back</Link>
                    </Button>
                )}
            </CardContent>
        </Card>
    )
}

export default function PaymentCallbackPage() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Suspense fallback={
                <Card className="w-full max-w-md">
                    <CardContent className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </CardContent>
                </Card>
            }>
                <PaymentCallbackContent />
            </Suspense>
        </div>
    )
}

"use client"

import { useState, useCallback, useRef } from "react"
import { createOrder, verifyPayment, getPaymentStatus, retryPaymentOrder } from "@/lib/api/payments"
import type { CreateOrderResult } from "@/lib/api/payments"

export type PaymentFlowState =
    | "idle"
    | "creating_order"
    | "checkout_open"
    | "verifying"
    | "polling"
    | "success"
    | "failed"
    | "cancelled"

export interface RazorpayConfig {
    amount: number
    currency: string
    eventTitle: string
    contactName?: string
    contactEmail?: string
    contactPhone?: string
}

export interface UseRazorpayReturn {
    state: PaymentFlowState
    error: string | null
    initiatePayment: (submissionId: string, config: RazorpayConfig) => Promise<void>
    retryPayment: (submissionId: string, config: RazorpayConfig) => Promise<void>
}

// ── Guaranteed lazy script loader ────────────────────────────────────────
// Resolves immediately if already loaded, injects + waits if not.
// Safe to call multiple times — idempotent.
function loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (typeof window === "undefined") {
            reject(new Error("Not in browser"))
            return
        }
        // Already loaded
        if ((window as any).Razorpay) {
            resolve()
            return
        }
        // Script tag exists but hasn't fired onload yet
        const existingScript = document.querySelector(
            'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
        ) as HTMLScriptElement | null
        if (existingScript) {
            existingScript.addEventListener("load", () => resolve())
            existingScript.addEventListener("error", () =>
                reject(new Error("Razorpay script failed to load. Check your connection."))
            )
            return
        }
        // Inject fresh script
        const script = document.createElement("script")
        script.src = "https://checkout.razorpay.com/v1/checkout.js"
        script.async = true
        script.onload = () => resolve()
        script.onerror = () =>
            reject(new Error("Failed to load Razorpay. Check your internet connection and try again."))
        document.head.appendChild(script)
    })
}

// ── Polling helper ────────────────────────────────────────────────────────
function pollPaymentStatus(
    paymentId: string,
    onSuccess: () => void,
    onFailed: () => void,
    onTimeout: () => void,
    maxAttempts = 12,
    intervalMs = 3000
): () => void {
    let attempts = 0
    const id = setInterval(async () => {
        attempts++
        try {
            const result = await getPaymentStatus(paymentId)
            const status = result.payment.status
            if (status === "SUCCESS") { clearInterval(id); onSuccess(); return }
            if (status === "FAILED" || status === "CANCELLED") { clearInterval(id); onFailed(); return }
            if (attempts >= maxAttempts) { clearInterval(id); onTimeout(); return }
        } catch {
            if (attempts >= maxAttempts) { clearInterval(id); onTimeout() }
        }
    }, intervalMs)
    // Return cleanup function
    return () => clearInterval(id)
}

export function useRazorpay(): UseRazorpayReturn {
    const [state, setState] = useState<PaymentFlowState>("idle")
    const [error, setError] = useState<string | null>(null)
    const checkoutOpenRef = useRef(false)
    const stopPollingRef = useRef<(() => void) | null>(null)

    const openCheckout = useCallback(async (
        config: RazorpayConfig,
        orderData: CreateOrderResult
    ) => {
        // Load Razorpay script — guaranteed before opening modal
        try {
            await loadRazorpayScript()
        } catch (err: any) {
            setState("failed")
            setError(err.message)
            checkoutOpenRef.current = false
            return
        }

        setState("checkout_open")

        const callbackUrl = new URL("/payment/callback", window.location.origin)
        callbackUrl.searchParams.set("paymentId", orderData.paymentId)
        // Encode the current form page URL so callback page can send user back
        callbackUrl.searchParams.set("returnUrl", encodeURIComponent(window.location.href))

        const options = {
            key: orderData.keyId,
            amount: orderData.amount,
            currency: orderData.currency,
            name: "YSM Infosolutions",
            description: config.eventTitle,
            order_id: orderData.orderId,

            // ── Mobile UPI redirect support ────────────────────
            // When Razorpay can't return control to the JS handler
            // (e.g. after UPI app completes payment on mobile),
            // it redirects the browser here instead.
            callback_url: callbackUrl.toString(),
            redirect: false,  // keep modal on desktop, allow redirect on mobile as fallback
            // ───────────────────────────────────────────────────

            prefill: {
                name: config.contactName ?? "",
                email: config.contactEmail ?? "",
                contact: config.contactPhone ?? "",
            },
            theme: { color: "#7c3aed" },
            modal: {
                ondismiss: () => {
                    checkoutOpenRef.current = false
                    setState("cancelled")
                },
            },
            handler: async (response: {
                razorpay_order_id: string
                razorpay_payment_id: string
                razorpay_signature: string
            }) => {
                checkoutOpenRef.current = false
                setState("verifying")
                try {
                    await verifyPayment({
                        razorpayOrderId: response.razorpay_order_id,
                        razorpayPaymentId: response.razorpay_payment_id,
                        razorpaySignature: response.razorpay_signature,
                    })
                } catch {
                    // Verification network error — still poll, webhook may confirm
                }
                setState("polling")
                stopPollingRef.current = pollPaymentStatus(
                    orderData.paymentId,
                    () => setState("success"),
                    () => { setState("failed"); setError("Payment failed. Please try again.") },
                    () => setState("success") // timeout = still show success, webhook will confirm
                )
            },
        }

        const rzp = new (window as any).Razorpay(options)
        rzp.open()
    }, [])

    const initiatePayment = useCallback(async (
        submissionId: string,
        config: RazorpayConfig
    ) => {
        if (checkoutOpenRef.current) return
        checkoutOpenRef.current = true
        setError(null)
        setState("creating_order")
        try {
            const orderData = await createOrder(submissionId)
            await openCheckout(config, orderData)
        } catch (err: any) {
            checkoutOpenRef.current = false
            setState("failed")
            setError(err.message ?? "Failed to initiate payment. Please try again.")
        }
    }, [openCheckout])

    const retryPayment = useCallback(async (
        submissionId: string,
        config: RazorpayConfig
    ) => {
        if (checkoutOpenRef.current) return
        checkoutOpenRef.current = true
        setError(null)
        setState("creating_order")
        try {
            const orderData = await retryPaymentOrder(submissionId)
            await openCheckout(config, orderData)
        } catch (err: any) {
            checkoutOpenRef.current = false
            setState("failed")
            setError(err.message ?? "Failed to retry payment.")
        }
    }, [openCheckout])

    return { state, error, initiatePayment, retryPayment }
}

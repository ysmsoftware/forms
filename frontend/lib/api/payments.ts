import { publicClient } from "./client"

export interface CreateOrderResult {
    orderId: string
    amount: number
    currency: string
    keyId: string
    paymentId: string
}

export interface PaymentStatusResult {
    payment: {
        id: string
        status: "CREATED" | "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED" | "REFUNDED"
        amount: number
        webhookConfirmed: boolean
        razorpayPaymentId: string | null
        paidAt: string | null
    }
}

export async function createOrder(submissionId: string): Promise<CreateOrderResult> {
    return publicClient<CreateOrderResult>("/payments/create-order", {
        method: "POST",
        body: JSON.stringify({ submissionId }),
    })
}

export async function verifyPayment(params: {
    razorpayOrderId: string
    razorpayPaymentId: string
    razorpaySignature: string
}): Promise<void> {
    return publicClient("/payments/verify", {
        method: "POST",
        body: JSON.stringify(params),
    })
}

export async function getPaymentStatus(paymentId: string): Promise<PaymentStatusResult> {
    return publicClient<PaymentStatusResult>(`/payments/${paymentId}`)
}

export async function retryPaymentOrder(submissionId: string): Promise<CreateOrderResult> {
    return publicClient<CreateOrderResult>("/payments/retry", {
        method: "POST",
        body: JSON.stringify({ submissionId }),
    })
}

import logger from "../config/logger";
import { BadRequestError, NotFoundError } from "../errors/http-errors";
import { RazorpayProvider } from "../providers/razorpay.provider";
import { IEventRepository } from "../repositories/event.repo";
import { IPaymentRepository } from "../repositories/payment.repo";
import { ISubmissionRepository } from "../repositories/submission.repo";
import { PaymentStatus, Payment } from "@prisma/client";

// ── Return types ───────────────────────────────────────────────────────────────

export type PaymentListResult = {
    items: Payment[];
    nextCursor: string | null;
};

export type PaymentDetailResult = {
    payment: {
        id: string;
        eventId: string;
        submissionId: string;
        amount: number;
        status: PaymentStatus;
        razorpayPaymentId: string | null;
        razorpayStatus: string | null;
        failureReason: string | null;
        attempts: number;
        paidAt: Date | null;
        createdAt: Date;
        webhookConfirmed: boolean;
    };
    eventId: string;
    contactId: string | null;
};


export class PaymentService {

    constructor(
        private paymentRepo: IPaymentRepository,
        private eventRepo: IEventRepository,
        private submissionRepo: ISubmissionRepository,
        private razorpay: RazorpayProvider
    ) { }


    async createOrder(params: { submissionId: string; }): Promise<{
        orderId: string;
        amount: number;
        currency: string;
        keyId: string;
        paymentId: string;
    }> {
        // Validate submission exists
        const submission = await this.submissionRepo.findSubmissionById(params.submissionId);
        if (!submission) {
            throw new NotFoundError("No submission found");
        }

        // Validate event exists & is payable
        const event = await this.eventRepo.findById(submission.eventId);
        if (!event) {
            throw new NotFoundError("No event found");
        }

        if (!event.paymentEnabled) {
            throw new BadRequestError("This event is not payable");
        }

        // Payment config
        const config = event.paymentConfig;
        if (!config || !config.amount) {
            throw new BadRequestError("Payment configuration invalid");
        }

        const amount = config.amount * 100; // paise
        const currency = (config.currency || 'INR').toUpperCase();

        // Check if a order exists for this submissionID
        const existingOrder = await this.paymentRepo.findBySubmissionId(params.submissionId);

        if (existingOrder?.status === "SUCCESS") {
            throw new BadRequestError("Payment already completed");
        }

        if (existingOrder && existingOrder?.status !== "FAILED" && existingOrder.razorpayOrderId) {
            return {
                orderId: existingOrder.razorpayOrderId,
                amount: existingOrder.amount,
                currency: existingOrder.currency,
                keyId: this.razorpay.getPublicKey(),
                paymentId: existingOrder.id
            }
        }

        // Create Razorpay order
        // Receipt must be <= 40 chars (Razorpay limit)
        // UUID is 36 chars — take first 8 chars as a short suffix
        const receiptSuffix = params.submissionId.replace(/-/g, "").slice(0, 30)
        const order = await this.razorpay.createOrder({
            amount,
            currency,
            receipt: `rcpt_${receiptSuffix}`,
            notes: {
                submissionId: params.submissionId,
                eventId: event.id,
                eventName: event.title
            }
        })
        // Store payment in DB
        const createdPayment = await this.paymentRepo.create({
            eventId: event.id,
            submissionId: params.submissionId,
            ...(submission.contactId && { contactId: submission.contactId }),
            amount,
            currency,
            razorpayOrderId: order.id,
        })

        return {
            orderId: order.id,
            amount,
            currency,
            keyId: this.razorpay.getPublicKey(),
            paymentId: createdPayment.id
        }

    }

    async verifyPayment(params: {
        razorpayOrderId: string;
        razorpayPaymentId: string;
        razorpaySignature: string;
    }): Promise<void> {

        try {
            // verify signature
            const isVerified = await this.razorpay.verifyPaymentSignature(params);
            if (!isVerified) {
                throw new BadRequestError("Payment signature does not match");
            }

            const payment = await this.paymentRepo.findByRazorpayOrderId(params.razorpayOrderId);
            if (!payment) {
                throw new NotFoundError("Payment not found");
            }

            if (payment.status === PaymentStatus.SUCCESS) {
                return; // already completed
            }

            if (payment.status === PaymentStatus.FAILED) {
                return; // webhook will finalize retry
            }

            await this.paymentRepo.markPending(params.razorpayOrderId);

        } catch (error) {
            logger.error("Failed to verify Payment", error);
            throw error instanceof BadRequestError
                ? error
                : new BadRequestError(`Payment verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async handleWebhook(
        signature: string,
        payload: any
    ): Promise<void> {

        const isValid = this.razorpay.verifyWebhookSignature(
            payload,
            signature
        );

        if (!isValid) {
            throw new BadRequestError("Invalid webhook signature");
        }

        const event = payload.event;
        // only handle payment events
        if (!event?.startsWith("payment.")) {
            return;
        }

        const paymentEntity = payload.payload?.payment?.entity;
        if (!paymentEntity) {
            return;
        }

        const razorpayOrderId = paymentEntity.order_id;
        if (!razorpayOrderId) {
            return;
        }

        const payment = await this.paymentRepo.findByRazorpayOrderId(razorpayOrderId);
        if (!payment) {
            logger.warn("Webhook received for unknown order", { razorpayOrderId });
            return; // order not found in our sys
        }
        if (payment.amount !== paymentEntity.amount) {
            logger.error("Amount mismatch in webhook", {
                dbAmount: payment.amount,
                razorpayAmount: paymentEntity.amount,
                orderId: razorpayOrderId
            });
            return;
        }



        switch (event) {
            case "payment.captured":
                if (payment.status === "SUCCESS") { // idempotent check
                    return;
                }
                if (payment.status === "FAILED") { // no downgrade from failed
                    return;
                }

                await this.paymentRepo.markSuccess({
                    razorpayOrderId,
                    razorpayPaymentId: paymentEntity.id,
                    paidAt: new Date(paymentEntity.created_at * 1000),
                    metadata: {
                        event: payload.event,
                        paymentId: paymentEntity.id,
                        method: paymentEntity.method,
                        email: paymentEntity.email,
                        contact: paymentEntity.contact
                    }
                });

                break;
            case "payment.failed":
                if (payment.status === "SUCCESS") {
                    return;
                }
                await this.paymentRepo.markFailed(
                    razorpayOrderId,
                    paymentEntity.error_description || "Payment failed"
                );

                break;

            default:
                break;
        }

    }

    async retryPayment(submissionId: string): Promise<{
        orderId: string;
        amount: number;
        currency: string;
        keyId: string;
    }> {
        // validate submission
        const submission = await this.submissionRepo.findSubmissionById(submissionId);
        if (!submission) {
            throw new NotFoundError("Submission not found");
        }
        // validate event
        const event = await this.eventRepo.findById(submission.eventId);
        if (!event) {
            throw new NotFoundError("Event not found");
        }
        if (!event.paymentEnabled) {
            throw new BadRequestError("Payment not enabled for this event");
        }

        // existing payment
        const payment = await this.paymentRepo.findBySubmissionId(submissionId);
        if (!payment) {
            throw new NotFoundError("Payment not found");
        }

        // Retry only if FAILED
        if (payment.status !== "FAILED") {
            throw new BadRequestError("Payment retry allowed only for failed payments");
        }

        const config = event.paymentConfig;
        if (!config?.amount) {
            throw new BadRequestError("Invalid payment configuration");
        }

        const amount = config.amount * 100;
        const currency = (config.currency || "INR").toUpperCase();


        // create order
        // Receipt must be <= 40 chars (Razorpay limit)
        const retryReceiptSuffix = submissionId.replace(/-/g, "").slice(0, 27)
        const order = await this.razorpay.createOrder({
            amount,
            currency,
            receipt: `rcpt_r_${retryReceiptSuffix}`,
            notes: {
                submissionId,
                eventId: event.id,
                retry: "true",
            }
        });

        // update existing record
        await this.paymentRepo.updateForRetry({
            submissionId,
            razorpayOrderId: order.id
        });

        return {
            orderId: order.id,
            amount,
            currency,
            keyId: this.razorpay.getPublicKey()
        };

    }

    async cancelPayment(paymentId: string): Promise<void> {

        const payment = await this.paymentRepo.findById(paymentId);
        if (!payment) {
            throw new NotFoundError("Payment not found");
        }

        if (payment.status === "SUCCESS") {
            throw new BadRequestError("Cannot cancel a successful payment");
        }

        if (payment.status === "CANCELLED") {
            return;
        }
        await this.paymentRepo.markCancelled(paymentId);
    }

    async getPaymentsByEvent(params: {
        eventId: string;
        limit: number;
        cursor?: string;
        status?: PaymentStatus | undefined;
    }): Promise<PaymentListResult> {

        const event = await this.eventRepo.findById(params.eventId);

        if (!event) {
            throw new NotFoundError("Event not found");
        }
        const limit = Math.min(params.limit ?? 50, 100);
        const payments = await this.paymentRepo.findByEventIdPaginated({
            eventId: params.eventId,
            limit,
            ...(params.cursor && { cursor: params.cursor }),
            ...(params.status && { status: params.status })
        });

        return payments;
    }

    async getPaymentById(paymentId: string): Promise<PaymentDetailResult> {

        const payment = await this.paymentRepo.findById(paymentId);
        if (!payment) {
            throw new NotFoundError("Payment record not found");
        }

        return {
            payment: {
                id: payment.id,
                eventId: payment.eventId,
                submissionId: payment.submissionId,
                amount: payment.amount,
                status: payment.status,
                razorpayPaymentId: payment.razorpayPaymentId,
                razorpayStatus: payment.razorpayStatus,
                failureReason: payment.failureReason,
                attempts: payment.attempts,
                paidAt: payment.paidAt,
                createdAt: payment.createdAt,
                webhookConfirmed: payment.webhookConfirmed,
            },
            eventId: payment.eventId,
            contactId: payment.contactId
        }
    }

}
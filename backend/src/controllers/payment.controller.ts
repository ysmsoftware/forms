import { Request, Response, NextFunction } from "express";
import { PaymentService, PaymentListResult, PaymentDetailResult } from "../services/payment.service";
import { PaymentStatus } from "@prisma/client";
import logger from "../config/logger";


export class PaymentController { 

    constructor(private paymentService: PaymentService) {}
    
    createOrder = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const submissionId = req.body.submissionId;

            if(!submissionId) {
                return res.status(400).json({ 
                    success: false,
                    message: 'SubmissionId is required' });
            }
            logger.info("Create order request", {submissionId, requestId: req.id })
            const result = await this.paymentService.createOrder({submissionId});

            return res.status(201).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    verifyPayment = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const  { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

            if(!razorpayOrderId) {
                return res.status(400).json({ success: false, message: "Razorpay orderId is needed" })
            }

            if(!razorpayPaymentId) {
                return res.status(400).json({ success: false, message: "Razorpay paymentId is needed" })
            }

            if(!razorpaySignature) {
                return res.status(400).json({ success: false, message: "Razorpay Signature is needed" })
            }
            logger.info("Verify payment request", {razorpayOrderId, requestId: req.id });

            const result = await this.paymentService.verifyPayment({razorpayOrderId, razorpayPaymentId, razorpaySignature});

            return res.status(200).json({
                success: true,
                data: result
            })

        } catch(error) {
            next(error);
        }
    }

    handleWebhook = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const signature = req.headers['x-razorpay-signature'] as string;
            if(!signature) {
                return res.status(400).json({ success: false, message: "Missing Razorpay signature" });
            }
            const rawBody = req.body;

            logger.info("Webhook request", { event: rawBody?.event, requestId: req.id });

            await this.paymentService.handleWebhook(signature, rawBody);

            return res.status(200).json({ status: "ok" });

        } catch (error) {
            logger.error("Webhook error", { error });
            return res.status(200).json({ status: "received" });
        }
    }

    retryPayment = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const submissionId = req.body.submissionId as string;
            if(!submissionId) {
                return res.status(400).json({ success: false, message: "Submission ID is for Retry of payment"});
            }

            logger.info("Retry payment request", {submissionId, requestId: req.id });

            await this.paymentService.retryPayment(submissionId);
            
            return res.status(200).json({ success: true });
        } catch (error) {
            next(error);
        }
    }

    cancelPayment = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const paymentId = req.params.paymentId as string;
            if(!paymentId) {
                return res.status(400).json({ success: false, message: "Payment ID is required to cancel a payment" });
            }
            
            logger.info("Cancel payment request", {paymentId, requestId: req.id });

            await this.paymentService.cancelPayment(paymentId);

            return res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

    getPaymentsByEvent = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { organizationId } = req.user!;
            const eventId = req.params.eventId as string;
            const cursor = req.query.cursor as string;
            const limit = Math.min(
                parseInt(req.query.limit as string) || 50,
                100
            );
            
            const status = req.query.status &&
                Object.values(PaymentStatus).includes(req.query.status as PaymentStatus)
                    ? (req.query.status as PaymentStatus)
                    : undefined;

            if(!eventId) {
                return res.status(400).json({ success: false, message: "event Id is required" });
            }


            logger.info("Fetch event payments request", {eventId, requestId: req.id });

            const result = await this.paymentService.getPaymentsByEvent({ organizationId, eventId, limit, status, cursor})
            return res.status(200).json({
                success: true,
                data: result
            });
            
        } catch (error) {
            next(error);
        }
    }

    getPaymentById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            
            const paymentId = req.params.paymentId as string;
            if(!paymentId) {
                return res.status(400).json({ success: false, message: "paymentId is required" });
            }
            logger.info("Fetch payment request", {paymentId, requestId: req.id });

            const result =  await this.paymentService.getPaymentById(paymentId);
            return res.status(200).json({
                success: true, 
                data: result,
            });

        } catch (error) {
            next(error);
        }
    }

    getAllPayment = async(req: Request, res: Response, next: NextFunction) => {
        try {
            const { organizationId } = req.user!;
            const eventId = req.query.eventId as string;
            const contactId = req.query.contactId as string;
            const razorpayPaymentId = req.query.razorpayPaymentId as string;
            const cursor = req.query.cursor as string;
            const limit = Math.min(
                parseInt(req.query.limit as string) || 50, 100
            );

            const status = req.query.status && 
                    Object.values(PaymentStatus).includes(req.query.status as PaymentStatus)
                        ? (req.query.status as PaymentStatus)
                        : undefined;

            logger.info("Fetch Payments request", {eventId, contactId, razorpayPaymentId, requestId: req.id });

            const  result = await this.paymentService.getAllPayments({organizationId, eventId, contactId, razorpayPaymentId, cursor, status, limit});

            
            res.status(200).json({
                success: true,
                data: result
            });

        } catch(err) {
            next(err);
        }
    }
    
}
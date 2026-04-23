import { Router } from "express";
import { authenticatedOrgMiddleware } from "../middlewares/authenticated-org.middleware";
import { paymentController } from "../container";

const router = Router();


router.post("/create-order", paymentController.createOrder);
router.post("/verify", paymentController.verifyPayment);
router.post('/retry', paymentController.retryPayment)
// router.post('/webhook', paymentController.handleWebhook);


router.get('/events/:eventId', authenticatedOrgMiddleware, paymentController.getPaymentsByEvent);
router.get('/', authenticatedOrgMiddleware, paymentController.getAllPayment);
router.get('/:paymentId', paymentController.getPaymentById);
router.post("/:paymentId/cancel",  paymentController.cancelPayment);

export default router;

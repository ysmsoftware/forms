import { Router } from "express";
import authRoutes from "./auth.routes";
import eventRoutes from "./event.routes";
import formRouter from "./form.routes";
import submissionRouter  from "./submission.routes";
import fileRouter from "./file.routes";
import analyticsRouter from "./analytics.routes";
import paymentRouter from "./payment.routes";
import certificateRouter from  './certificate.routes';
import messageRouter from './message.routes';
import contactRouter from './contact.routes';
import tagRouter from './tag.routes';

const router = Router();

router.use("/auth", authRoutes);
router.use("/events", eventRoutes);
router.use("/submissions", submissionRouter)
router.use("/forms", formRouter);
router.use("/files", fileRouter);
router.use("/analytics", analyticsRouter);
router.use("/payments", paymentRouter);
router.use("/certificates", certificateRouter);
router.use("/messages", messageRouter);
router.use("/contacts", contactRouter);
router.use("/tags", tagRouter );

export default router;
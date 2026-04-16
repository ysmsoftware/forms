import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { contactController } from "../container";


const router = Router();

router.get("/", authMiddleware, contactController.list);
router.post("/", authMiddleware, contactController.create);

router.get("/:id/events", authMiddleware, contactController.getEvents);
router.get("/:id/certificates", authMiddleware, contactController.getCertificates);
router.get("/:id/payments", authMiddleware, contactController.getPayments);
router.get("/:id/messages", authMiddleware, contactController.getMessages);
router.get("/:id/tags", authMiddleware, contactController.getTags);
router.get("/:id/files", authMiddleware, contactController.getFiles)
router.patch("/:id/restore", authMiddleware, contactController.restore);

router.get("/:id", authMiddleware, contactController.getById);
router.put("/:id", authMiddleware, contactController.update);
router.delete("/:id", authMiddleware, contactController.delete);

export default router;
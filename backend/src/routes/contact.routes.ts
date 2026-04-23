import { Router } from "express";
import { authenticatedOrgMiddleware } from "../middlewares/authenticated-org.middleware";
import { contactController } from "../container";


const router = Router();

router.get("/", authenticatedOrgMiddleware, contactController.list);
router.post("/", authenticatedOrgMiddleware, contactController.create);

router.get("/:id/events", authenticatedOrgMiddleware, contactController.getEvents);
router.get("/:id/certificates", authenticatedOrgMiddleware, contactController.getCertificates);
router.get("/:id/payments", authenticatedOrgMiddleware, contactController.getPayments);
router.get("/:id/messages", authenticatedOrgMiddleware, contactController.getMessages);
router.get("/:id/tags", authenticatedOrgMiddleware, contactController.getTags);
router.get("/:id/files", authenticatedOrgMiddleware, contactController.getFiles)
router.patch("/:id/restore", authenticatedOrgMiddleware, contactController.restore);

router.get("/:id", authenticatedOrgMiddleware, contactController.getById);
router.put("/:id", authenticatedOrgMiddleware, contactController.update);
router.delete("/:id", authenticatedOrgMiddleware, contactController.delete);

export default router;
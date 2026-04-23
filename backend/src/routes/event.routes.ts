import { Router } from "express";
import { authenticatedOrgMiddleware } from "../middlewares/authenticated-org.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createEventSchema, updateEventSchema } from "../validators/event.schema";
import { eventController } from "../container";

const router = Router();


router.get("/slug/:slug", eventController.findBySlug);
router.post("/", authenticatedOrgMiddleware, validate(createEventSchema), eventController.createEvent);
router.get("/", authenticatedOrgMiddleware, eventController.findByOrganization);
router.put("/:id", authenticatedOrgMiddleware, validate(updateEventSchema), eventController.updateEvent);
router.get("/:id", authenticatedOrgMiddleware, eventController.findById);
router.put('/:id/publish', authenticatedOrgMiddleware, eventController.publishEvent);
router.patch('/:id/close', authenticatedOrgMiddleware, eventController.closeEvent);
router.delete('/:id', authenticatedOrgMiddleware, eventController.deleteEvent);

export default router; 
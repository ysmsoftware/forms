import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createEventSchema, updateEventSchema } from "../validators/event.schema";
import { eventController } from "../container";

const router = Router();


router.get("/slug/:slug", eventController.findBySlug);
router.post("/", authMiddleware, validate(createEventSchema), eventController.createEvent);
router.get("/", authMiddleware, eventController.findByUser);
router.put("/:id", authMiddleware, validate(updateEventSchema), eventController.updateEvent);
router.get("/:id", authMiddleware, eventController.findById);
router.put('/:id/publish', authMiddleware, eventController.publishEvent);
router.patch('/:id/close', authMiddleware, eventController.closeEvent);
router.delete('/:id', authMiddleware, eventController.deleteEvent);

export default router; 
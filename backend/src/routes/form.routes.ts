import { Router } from "express";
import { formController } from "../container";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
    createFormSchema,
    updateFormSchema,
} from "../validators/form.schema";

const router = Router();


// ADMIN / AUTHENTICATED

// Create form for event
router.post(
    "/event/:eventId",
    authMiddleware,
    validate(createFormSchema),
    formController.createForm
);

// Upsert form for event
router.put(
    "/event/:eventId",
    authMiddleware,
    validate(updateFormSchema),
    formController.upsertForm
);

// Get form by event (admin)
router.get(
    "/event/:eventId",
    authMiddleware,
    formController.getFormByEvent
);

// PUBLIC (NO AUTH)
// Get public form by event slug
router.get(
    "/slug/:slug",
    formController.getFormBySlug
);

// Get form by id (admin)
router.get(
    "/:formId",
    authMiddleware,
    formController.getFormById
);

// Publish form
router.post(
    "/:formId/publish",
    authMiddleware,
    formController.publishForm
);

// Soft delete form
router.delete(
    "/:formId",
    authMiddleware,
    formController.deleteForm
);

export default router;

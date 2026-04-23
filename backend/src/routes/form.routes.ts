import { Router } from "express";
import { formController } from "../container";
import { authenticatedOrgMiddleware } from "../middlewares/authenticated-org.middleware";
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
    authenticatedOrgMiddleware,
    validate(createFormSchema),
    formController.createForm
);

// Upsert form for event
router.put(
    "/event/:eventId",
    authenticatedOrgMiddleware,
    validate(updateFormSchema),
    formController.upsertForm
);

// Get form by event (admin)
router.get(
    "/event/:eventId",
    authenticatedOrgMiddleware,
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
    authenticatedOrgMiddleware,
    formController.getFormById
);

// Publish form
router.post(
    "/:formId/publish",
    authenticatedOrgMiddleware,
    formController.publishForm
);

// Soft delete form
router.delete(
    "/:formId",
    authenticatedOrgMiddleware,
    formController.deleteForm
);

export default router;

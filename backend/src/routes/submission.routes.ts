import { Router } from "express";
import { submissionController } from "../container";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { startSubmission, submissionFilter, submissionForm, } from "../validators/submission.schema";
import rateLimit from "express-rate-limit";
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../config/redis';


const router = Router();

// Rate limiter — backed by Redis so limits survive restarts
// and are shared across multiple server instances
const submitLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,   // Return RateLimit headers
    legacyHeaders: false,
    store: new RedisStore({
        sendCommand: (...args: string[]) => {
            const [command, ...rest] = args as [string, ...string[]];
            return redis.call(command, ...rest) as Promise<any>;
        },
    }),
    message: {
        success: false,
        message: "Too many submissions from this IP, please try again in 15 minutes."
    }
});


// PUBLIC ROUTES (User / Visitor)

// Get public form
router.get(
    "/:slug",
    submissionController.getPublicForm
);

// Record visit
router.post(
    "/:slug/visit",
    submissionController.recordVisit
);

// Start submission
router.post(
    "/:slug/start",
    validate(startSubmission),
    submissionController.startSubmission
);

// Submit form
router.post(
    "/:slug/submit",
    submitLimiter,
    validate(submissionForm),
    submissionController.submitForm
);

// Save draft
router.post(
    "/:slug/draft",
    submissionController.saveDraft
);

// Get draft
router.get(
    "/:slug/draft",
    submissionController.getDraft
);

// ADMIN ROUTES (Authenticated)

// Get submission by ID
router.get(
    "/admin/submissions/:id",
    authMiddleware,
    submissionController.getSubmissionById
);

// Get submissions by event
router.get(
    "/admin/events/:id/submissions",
    authMiddleware,
    validate(submissionFilter),
    submissionController.getSubmissionByEvent
);

export default router;

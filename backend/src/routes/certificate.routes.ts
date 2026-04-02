import { Router  } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { certificateController } from "../container";


const router  = Router();

// POST /api/certificates/generate  [single or many]
router.post(
    '/generate',
    authMiddleware,
    certificateController.issue
);

// GET /api/certificates/event/:eventId  — all certs for an event [auth]
router.get(
    '/event/:eventId',
    authMiddleware,
    certificateController.getByEvent
);

// GET /api/certificates/verify?certificateId=xxx  — public QR verify
router.get("/verify", certificateController.verify);

// POST /api/certificates/resolve-params
router.post("/resolve-params", authMiddleware, certificateController.resolveParams);

export default router;
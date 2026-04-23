import { Router  } from "express";
import { authenticatedOrgMiddleware } from "../middlewares/authenticated-org.middleware";
import { certificateController } from "../container";


const router  = Router();

// POST /api/certificates/generate  [single or many]
router.post(
    '/generate',
    authenticatedOrgMiddleware,
    certificateController.issue
);
// GET /api/certificates  — all certs with filters [auth]
router.get(
    '/',
    authenticatedOrgMiddleware,
    certificateController.getAll
);

// GET /api/certificates/event/:eventId  — all certs for an event [auth]
router.get(
    '/event/:eventId',
    authenticatedOrgMiddleware,
    certificateController.getByEvent
);

// GET /api/certificates/verify?certificateId=xxx  — public QR verify
router.get("/verify", certificateController.verify);

// POST /api/certificates/resolve-params
router.post("/resolve-params", authenticatedOrgMiddleware, certificateController.resolveParams);

// POST /api/certificates/resolve-params-template
router.post(
  "/resolve-params-template",
  authenticatedOrgMiddleware,
  certificateController.resolveParamsForTemplate
);

// POST /api/certificates/issue-direct
router.post(
  "/issue-direct",
  authenticatedOrgMiddleware,
  certificateController.issueDirect
);

export default router;
import { Router } from "express";
import { exportController } from "../container";
import { authenticatedOrgMiddleware } from "../middlewares/authenticated-org.middleware";

const router = Router();


// POST /admin/events/:id/export          → enqueueExport (returns exportLogId)
router.post(
    "/admin/events/:id/export",
    authenticatedOrgMiddleware,
    exportController.enqueueExport
);
// GET  /admin/exports/:exportLogId/status → getExportStatus (polling)
router.get(
    "/admin/exports/:exportLogId/status",
    authenticatedOrgMiddleware,
    exportController.getExportStatus
);
// GET  /admin/exports/:exportLogId/download → download CSV from Redis
router.get(
    "/admin/exports/:exportLogId/download",
    authenticatedOrgMiddleware,
    exportController.downloadExport
);
// GET  /admin/events/:id/export-logs      → getExportLogs (audit history)
router.get(
    "/admin/events/:id/export-logs",
    authenticatedOrgMiddleware,
    exportController.getExportLogs
);

export default router;

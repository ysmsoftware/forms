import { Request, Response, NextFunction } from "express";
import { ExportService } from "../services/export.service";
import { redis } from "../config/redis";

export class ExportController {
    constructor(private exportService: ExportService) { }

    enqueueExport = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { organizationId, id: userId } = req.user!;
            const eventId = req.params.id;

            if (!eventId || Array.isArray(eventId)) {
                return res.status(400).json({ error: "Valid event id is required" });
            }

            const result = await this.exportService.enqueueExport(
                eventId,
                organizationId,
                userId
            );

            return res.status(202).json({ success: true, ...result });
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /admin/exports/:exportLogId/status
     * Returns status of an export job.
     */
    getExportStatus = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { organizationId } = req.user!;
            const exportLogId = req.params.exportLogId as string;

            if (!exportLogId) {
                return res.status(400).json({ error: "Valid exportLogId is required" });
            }

            const status = await this.exportService.getExportStatus(exportLogId, organizationId);
            return res.status(200).json({ success: true, data: status });
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /admin/exports/:exportLogId/download
     * Downloads the generated CSV file from Redis.
     */
    downloadExport = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { organizationId } = req.user!;
            const exportLogId = req.params.exportLogId as string;

            if (!exportLogId) {
                return res.status(400).json({ error: "Valid exportLogId is required" });
            }

            const statusResult = await this.exportService.getExportStatus(exportLogId, organizationId);
            if (statusResult.status !== "DONE") {
                return res.status(400).json({ error: `Export is not ready. Current status: ${statusResult.status}` });
            }

            const csv = await redis.get(`csv:${exportLogId}`);
            if (!csv) {
                return res.status(404).json({ error: "Exported file has expired or is not found. Please try exporting again." });
            }

            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename="${statusResult.fileName}"; filename*=UTF-8''${encodeURIComponent(statusResult.fileName)}`
            );
            res.setHeader("X-Row-Count", String(statusResult.rowCount));
            res.setHeader("X-File-Name", statusResult.fileName);
            return res.status(200).send(csv);
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /admin/events/:id/export-logs
     * Returns the export audit log for a given event.
     */
    getExportLogs = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { organizationId } = req.user!;
            const eventId = req.params.id;

            if (!eventId || Array.isArray(eventId)) {
                return res.status(400).json({ error: "Valid event id is required" });
            }

            const logs = await this.exportService.getExportLogs(eventId, organizationId);

            return res.status(200).json({ success: true, data: logs });
        } catch (error) {
            next(error);
        }
    };
}

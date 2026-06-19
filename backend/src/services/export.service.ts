import { ForbiddenError, NotFoundError } from "../errors/http-errors";
import { IEventRepository } from "../repositories/event.repo";
import { ExportLogRepository, ExportLogRecord } from "../repositories/export-log.repo";
import { IUserRepository } from "../repositories/user.repo";
import { exportQueue, ExportJobData } from "../queues/message.queue";

export interface EnqueueExportResult {
    exportLogId: string;
    jobId: string;
    status: "PENDING";
}

export interface ExportStatusResult {
    exportLogId: string;
    status: string;
    rowCount: number;
    fileName: string;
    errorMessage: string | null;
    exportedAt: Date;
    exportedByName: string;
}

export class ExportService {
    constructor(
        private eventRepo: IEventRepository,
        private exportLogRepo: ExportLogRepository,
        private userRepo: IUserRepository,
    ) {}

    /**
     * Fire-and-forget: creates ExportLog (PENDING) + enqueues BullMQ job.
     * Returns immediately — frontend polls /export-status/:exportLogId.
     */
    async enqueueExport(
        eventId: string,
        organizationId: string,
        userId: string
    ): Promise<EnqueueExportResult> {
        const event = await this.eventRepo.findById(eventId);
        if (!event) throw new NotFoundError("Event not found");
        if (event.organizationId !== organizationId) throw new ForbiddenError("Unauthorized");

        const dbUser = await this.userRepo.findById(userId);
        const userName = dbUser?.name ?? "unknown";

        const exportLog = await this.exportLogRepo.create({
            organizationId,
            eventId,
            eventTitle: event.title,
            exportedByUserId: userId,
            exportedByName: userName,
        });

        const jobData: ExportJobData = {
            exportLogId: exportLog.id,
            eventId,
            organizationId,
            userId,
            userName,
            eventTitle: event.title,
            paymentEnabled: event.paymentEnabled,
        };

        const job = await exportQueue.add("generate-csv", jobData, {
            jobId: `export-${exportLog.id}`,
        });

        await this.exportLogRepo.markProcessing(exportLog.id, job.id!);

        return { exportLogId: exportLog.id, jobId: job.id!, status: "PENDING" };
    }

    /** Polling endpoint — returns current export status. */
    async getExportStatus(
        exportLogId: string,
        organizationId: string
    ): Promise<ExportStatusResult> {
        const log = await this.exportLogRepo.findById(exportLogId);
        if (!log) throw new NotFoundError("Export log not found");
        if (log.organizationId !== organizationId) throw new ForbiddenError("Unauthorized");

        return {
            exportLogId: log.id,
            status: log.status,
            rowCount: log.rowCount,
            fileName: log.fileName,
            errorMessage: log.errorMessage,
            exportedAt: log.exportedAt,
            exportedByName: log.exportedByName,
        };
    }

    /**
     * Returns the export audit log for a specific event.
     */
    async getExportLogs(eventId: string, organizationId: string): Promise<ExportLogRecord[]> {
        const event = await this.eventRepo.findById(eventId);
        if (!event) throw new NotFoundError("Event not found");
        if (event.organizationId !== organizationId) throw new ForbiddenError("Unauthorized");

        return this.exportLogRepo.findByEvent(eventId, organizationId);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

}


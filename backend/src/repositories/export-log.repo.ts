import { ExportLog, ExportStatus } from "@prisma/client";
import { prisma } from "../config/db";

export type ExportLogRecord = ExportLog;

export interface CreateExportLogInput {
    organizationId: string;
    eventId: string;
    eventTitle: string;
    exportedByUserId: string;
    exportedByName: string;
    /** jobId is set immediately when the BullMQ job is created */
    jobId?: string;
}

export interface IExportLogRepository {
    create(data: CreateExportLogInput): Promise<ExportLogRecord>;
    markProcessing(id: string, jobId: string): Promise<void>;
    markDone(id: string, rowCount: number, fileName: string): Promise<void>;
    markFailed(id: string, errorMessage: string): Promise<void>;
    findById(id: string): Promise<ExportLogRecord | null>;
    findByJobId(jobId: string): Promise<ExportLogRecord | null>;
    findByEvent(eventId: string, organizationId: string): Promise<ExportLogRecord[]>;
}

export class ExportLogRepository implements IExportLogRepository {
    async create(data: CreateExportLogInput): Promise<ExportLogRecord> {
        return prisma.exportLog.create({
            data: {
                organizationId: data.organizationId,
                eventId: data.eventId,
                eventTitle: data.eventTitle,
                exportedByUserId: data.exportedByUserId,
                exportedByName: data.exportedByName,
                jobId: data.jobId ?? null,
                status: "PENDING",
                rowCount: 0,
                fileName: "",
            },
        });
    }

    async markProcessing(id: string, jobId: string): Promise<void> {
        await prisma.exportLog.update({
            where: { id },
            data: { status: "PROCESSING", jobId },
        });
    }

    async markDone(id: string, rowCount: number, fileName: string): Promise<void> {
        await prisma.exportLog.update({
            where: { id },
            data: { status: "DONE", rowCount, fileName },
        });
    }

    async markFailed(id: string, errorMessage: string): Promise<void> {
        await prisma.exportLog.update({
            where: { id },
            data: { status: "FAILED", errorMessage },
        });
    }

    async findById(id: string): Promise<ExportLogRecord | null> {
        return prisma.exportLog.findUnique({ where: { id } });
    }

    async findByJobId(jobId: string): Promise<ExportLogRecord | null> {
        return prisma.exportLog.findUnique({ where: { jobId } });
    }

    async findByEvent(eventId: string, organizationId: string): Promise<ExportLogRecord[]> {
        return prisma.exportLog.findMany({
            where: { eventId, organizationId },
            orderBy: { exportedAt: "desc" },
            take: 50,
        });
    }
}

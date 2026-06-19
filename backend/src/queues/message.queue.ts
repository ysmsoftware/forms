import { Queue } from "bullmq";
import { redis } from "../config/redis";

export const messageQueue = new Queue("message-queue", {
    connection: redis,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    },
});

// ─── Export Queue ──────────────────────────────────────────────────────────────

export const EXPORT_QUEUE_NAME = "export-queue";

export interface ExportJobData {
    exportLogId: string;
    eventId: string;
    organizationId: string;
    userId: string;
    userName: string;
    eventTitle: string;
    paymentEnabled: boolean;
}

export const exportQueue = new Queue<ExportJobData>(EXPORT_QUEUE_NAME, {
    connection: redis,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 100 },
    },
});

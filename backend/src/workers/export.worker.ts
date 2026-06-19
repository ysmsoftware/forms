import { Worker as BullMQWorker } from "bullmq";
import { redis } from "../config/redis";
import { workerRegistry } from "./worker.registry";
import { EXPORT_QUEUE_NAME } from "../queues/message.queue";
import { ExportWorkerService } from "./export.worker.service";
import { SubmissionsRepository } from "../repositories/submission.repo";
import { FormRepositories } from "../repositories/form.repo";
import { ExportLogRepository } from "../repositories/export-log.repo";
import logger from "../config/logger";

class ExportWorker {
    name = "export-worker";
    constructor(private workerService: ExportWorkerService) { }

    start() {
        const worker = new BullMQWorker(
            EXPORT_QUEUE_NAME,
            async (job) => {
                logger.info(`Processing export job ${job.id}`);
                await this.workerService.process(job.data);
            },
            { connection: redis, concurrency: 2 }
        );

        worker.on("failed", (job, err) => {
            logger.error(`Export job failed`, { jobId: job?.id, error: err.message });
        });
        worker.on("completed", (job) => {
            logger.info(`Export job completed`, { jobId: job.id });
        });
    }
}

const workerService = new ExportWorkerService(
    new SubmissionsRepository(),
    new FormRepositories(),
    new ExportLogRepository()
);
const exportWorker = new ExportWorker(workerService);
workerRegistry.register(exportWorker);
import { Worker as BullMQWorker } from "bullmq";
import { MessageRepository } from "../repositories/message.repo";
import { MessageWorkerService } from "./message.worker.service";
import { redis } from "../config/redis";
import { workerRegistry } from "./worker.registry";
import { Worker } from "./worker.interface";

export class MessageWorker implements Worker {
    name = "message-worker";

    constructor(
        private workerService: MessageWorkerService,
        private messageRepo: MessageRepository
    ) { }

    start() {
        const worker = new BullMQWorker(
            "message-queue",
            async (job) => {
                await this.workerService.process(job.data.messageLogId);
            },
            {
                connection: redis,
                concurrency: 10,
            }
        );

        worker.on("failed", async (job, err) => {
            if (!job) return;

            const maxAttempts = job.opts.attempts ?? 1;
            if (job.attemptsMade >= maxAttempts) {
                await this.messageRepo.updateStatus(job.data.messageLogId, "FAILED");
            }
        });
    }
}

const messageRepo = new MessageRepository();
const workerService = new MessageWorkerService(messageRepo);
const messageWorker = new MessageWorker(workerService, messageRepo);

workerRegistry.register(messageWorker);
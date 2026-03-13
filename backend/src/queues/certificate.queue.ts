import { Queue } from "bullmq";
import { redis } from '../config/redis';

export const certificateQueue = new Queue(
    "certificate-queue",
    {
        connection: redis,
        defaultJobOptions:{
            attempts: 3,
            backoff: { type: "exponential", delay: 5000 },
            removeOnComplete: 1000,
            removeOnFail: 5000
        }
    }
);
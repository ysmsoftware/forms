import cron from "node-cron";
import { AnalyticsService } from "../services/analytics.service";
import logger from "../config/logger";
import { redis } from "../config/redis";
import { workerRegistry } from "./worker.registry";
import { Worker } from "node:worker_threads";
import { EventRepository } from "../repositories/event.repo";
import { AnalyticsRepository } from "../repositories/analytics.repo";


export class AnalyticsWorker {

    name = "analytics-worker";

    constructor(
        private analyticService: AnalyticsService
    ) {}

    // Flush redis deltas for all active events
    async flushAllEvents() {
        const lock = await redis.set(
            "analytics:worker:lock",
            "1",
            "EX",
            14 *60,
            "NX"
        );

        if(!lock) {
            logger.info("Analytics woker skipped (lock exists)");
            return;
        }

        logger.info("Analytics worker started snapshot");

        try {
            const eventIds = await redis.smembers("analytics:activeEvents");

            if(!eventIds.length) {
                logger.info("No active analytics events");
                return;
            }

            for(const eventId of eventIds) {
                try {
                    await this.analyticService.snapshotEvent(eventId);

                    await redis.srem("analytics:activeEvents", eventId);
                } catch(err) {
                    logger.error("Snapshot failed for event", { eventId, err });
                }
            }

            logger.info("Analytics snapshot completed");
        } catch(err) {
            logger.error("Analytics worker failed", err);
        } finally {
            await redis.del("analytics:worker:lock");
        }
    }

    start(){
        cron.schedule("*/15 * * * *", async() => {
            await this.flushAllEvents();
        });

        logger.info("Analytics worker scheduled (every 15 mintues)");
    }

}


// add Worker self regiter
// i.e call workerRegistry.register()
workerRegistry.register(
    new AnalyticsWorker(new AnalyticsService(new AnalyticsRepository(), new EventRepository()))
);
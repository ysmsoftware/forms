import logger from "../config/logger";
import { workerRegistry } from "./worker.registry";


// Import workers ONLY to trigger registration
import "./analytics.worker";
import "./dailyAnalytics.worker";
import "./certificate.worker";
import "./message.worker";

export function startWorkers() {
    logger.info("Starting background workers...");
    workerRegistry.startAll();
    logger.info("All worker started successfully");
}
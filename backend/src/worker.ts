import dotenv from "dotenv";
dotenv.config();

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

import logger from "./config/logger";
import { startWorkers } from "./workers";


logger.info("Worker process started");

startWorkers();


process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception in worker:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection in worker at:", promise, "reason:", reason);
});
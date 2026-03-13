import logger from "./config/logger";
import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { connectDB, prisma } from "./config/db";
import { redis } from "./config/redis";
import { Server } from "http";

let server: Server;
let isShuttingDown = false;

const REQUIRED_ENV = ['DATABASE_URL', 'REDIS_HOST', 'REDIS_PORT', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'];

const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
    logger.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
    process.exit(1);
}

async function bootstrap() {
    try {
        logger.info("Bootstrapping server...");

        await connectDB();

        server = app.listen(process.env.PORT, () => {
            logger.info(`Server is running on port ${process.env.PORT}`);
        });

        process.on("SIGTERM", shutdown);
        process.on("SIGINT", shutdown);

    } catch (error) {
        logger.error("Failed to start server", error);
        process.exit(1);
    }
}

async function shutdown() {
    // Guard: ignore duplicate signals
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.warn("Shutdown signal received, draining connections...");

    // Force-exit after 15s if graceful drain takes too long.
    // .unref() means this timer does NOT hold the event loop open —
    // if everything closes cleanly before 15s, the process exits immediately.
    const forceExit = setTimeout(() => {
        logger.error("Graceful shutdown timed out after 15s, forcing exit");
        process.exit(1);
    }, 15_000);
    forceExit.unref();

    // 1. Stop accepting new HTTP requests, wait for in-flight ones to finish
    if (server) {
        await new Promise<void>((resolve) => server.close(() => resolve()));
        logger.warn("HTTP server closed");
    }

    // 2. Close DB and Redis connections cleanly
    await Promise.allSettled([
        prisma.$disconnect().then(() => logger.warn("Prisma disconnected")),
        redis.quit().then(() => logger.warn("Redis disconnected")),
    ]);

    logger.warn("Shutdown complete");
    process.exit(0);
}

bootstrap();

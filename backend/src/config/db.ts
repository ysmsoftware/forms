import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import logger from "./logger";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Configure WebSocket for Neon
// neonConfig.webSocketConstructor = ws;

// const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "production"
        ? ["error"]
        : ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function connectDB() {
  try {
    await prisma.$connect();
    logger.info("Prisma connected to PostgreSQL");
  } catch (error) {
    logger.error("Prisma connection failed", error);
    throw error;
  }
}
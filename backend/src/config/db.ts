import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import logger from "./logger";

const globalForPrisma = global as unknown as { prisma: PrismaClient };


const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
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
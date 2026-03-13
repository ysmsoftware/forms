/*
  Warnings:

  - The `status` column on the `MessageLog` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('QUEUED', 'PROCESSING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "MessageLog" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "providerResponse" JSONB,
DROP COLUMN "status",
ADD COLUMN     "status" "MessageStatus" NOT NULL DEFAULT 'QUEUED';

-- CreateIndex
CREATE INDEX "MessageLog_status_idx" ON "MessageLog"("status");

-- CreateIndex
CREATE INDEX "MessageLog_type_idx" ON "MessageLog"("type");

/*
  Warnings:

  - A unique constraint covering the columns `[jobId]` on the table `ExportLog` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- AlterTable
ALTER TABLE "ExportLog" ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "jobId" TEXT,
ADD COLUMN     "status" "ExportStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "rowCount" SET DEFAULT 0,
ALTER COLUMN "fileName" SET DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "ExportLog_jobId_key" ON "ExportLog"("jobId");

-- CreateIndex
CREATE INDEX "ExportLog_status_idx" ON "ExportLog"("status");

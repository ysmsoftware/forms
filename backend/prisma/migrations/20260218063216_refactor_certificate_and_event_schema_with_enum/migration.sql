/*
  Warnings:

  - You are about to drop the column `certificateUrl` on the `Certificate` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('QUEUED', 'PROCESSING', 'GENERATED', 'UPLOADED', 'FAILED');

-- CreateEnum
CREATE TYPE "CertificateTemplateType" AS ENUM ('ACHIEVEMENT', 'APPOINTMENT', 'COMPLETION', 'INTERNSHIP', 'WORKSHOP');

-- DropIndex
DROP INDEX "Payment_razorpayOrderId_razorpayPaymentId_idx";

-- AlterTable
ALTER TABLE "Certificate" DROP COLUMN "certificateUrl",
ADD COLUMN     "fileAssetId" TEXT,
ADD COLUMN     "status" "CertificateStatus" NOT NULL DEFAULT 'QUEUED',
ADD COLUMN     "templateType" "CertificateTemplateType" NOT NULL DEFAULT 'ACHIEVEMENT',
ALTER COLUMN "contactId" DROP NOT NULL,
ALTER COLUMN "issuedAt" DROP NOT NULL,
ALTER COLUMN "issuedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "templateType" "CertificateTemplateType" NOT NULL DEFAULT 'ACHIEVEMENT';

-- CreateIndex
CREATE INDEX "Payment_submissionId_status_idx" ON "Payment"("submissionId", "status");

-- CreateIndex
CREATE INDEX "Payment_eventId_createdAt_idx" ON "Payment"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_razorpayOrderId_idx" ON "Payment"("razorpayOrderId");

-- CreateIndex
CREATE INDEX "Payment_razorpayPaymentId_idx" ON "Payment"("razorpayPaymentId");

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_fileAssetId_fkey" FOREIGN KEY ("fileAssetId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

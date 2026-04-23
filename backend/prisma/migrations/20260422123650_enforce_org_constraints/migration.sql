/*
  Warnings:

  - Made the column `organizationId` on table `Contact` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `Event` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `EventAnalytics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `EventAnalyticsDaily` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `FormSubmission` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `MessageLog` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `Tag` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "MessageLog" DROP CONSTRAINT "MessageLog_organizationId_fkey";

-- AlterTable
ALTER TABLE "Contact" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Event" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "EventAnalytics" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "EventAnalyticsDaily" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "FormSubmission" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "MessageLog" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Tag" ALTER COLUMN "organizationId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "MessageLog" ADD CONSTRAINT "MessageLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

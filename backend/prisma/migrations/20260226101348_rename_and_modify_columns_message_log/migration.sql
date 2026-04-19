/*
  Warnings:

  - You are about to drop the column `attempts` on the `MessageLog` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MessageLog" DROP COLUMN "attempts",
ADD COLUMN     "attemptCount" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "sentAt" DROP DEFAULT;

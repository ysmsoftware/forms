-- DropForeignKey
ALTER TABLE "FileAsset" DROP CONSTRAINT "FileAsset_contactId_fkey";

-- AlterTable
ALTER TABLE "FileAsset" ALTER COLUMN "contactId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "FileAsset_contactId_idx" ON "FileAsset"("contactId");

-- CreateIndex
CREATE INDEX "FileAsset_eventId_idx" ON "FileAsset"("eventId");

-- CreateIndex
CREATE INDEX "FileAsset_expiresAt_idx" ON "FileAsset"("expiresAt");

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

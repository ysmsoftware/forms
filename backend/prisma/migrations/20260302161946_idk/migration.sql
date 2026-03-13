-- AlterTable
ALTER TABLE "MessageLog" ADD COLUMN     "params" JSONB;

-- CreateIndex
CREATE INDEX "MessageLog_createdAt_idx" ON "MessageLog"("createdAt");

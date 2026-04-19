-- DropIndex
DROP INDEX "Payment_eventId_idx";

-- DropIndex
DROP INDEX "Payment_razorpayOrderId_idx";

-- DropIndex
DROP INDEX "Payment_status_idx";

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "failureReason" TEXT;

-- CreateIndex
CREATE INDEX "Payment_eventId_status_idx" ON "Payment"("eventId", "status");

-- CreateIndex
CREATE INDEX "Payment_razorpayOrderId_razorpayPaymentId_idx" ON "Payment"("razorpayOrderId", "razorpayPaymentId");

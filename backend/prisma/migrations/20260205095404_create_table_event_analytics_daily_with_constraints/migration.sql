-- CreateTable
CREATE TABLE "EventAnalyticsDaily" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "visits" INTEGER NOT NULL DEFAULT 0,
    "started" INTEGER NOT NULL DEFAULT 0,
    "submitted" INTEGER NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventAnalyticsDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventAnalyticsDaily_eventId_date_idx" ON "EventAnalyticsDaily"("eventId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "EventAnalyticsDaily_eventId_date_key" ON "EventAnalyticsDaily"("eventId", "date");

-- CreateIndex
CREATE INDEX "EventAnalytics_eventId_idx" ON "EventAnalytics"("eventId");

-- AddForeignKey
ALTER TABLE "EventAnalyticsDaily" ADD CONSTRAINT "EventAnalyticsDaily_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

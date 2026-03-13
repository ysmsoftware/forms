/*
  Warnings:

  - A unique constraint covering the columns `[visitorId,eventId]` on the table `VisitSession` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "VisitSession_visitorId_eventId_key" ON "VisitSession"("visitorId", "eventId");

/*
  Warnings:

  - A unique constraint covering the columns `[contactId,eventId]` on the table `ContactEvent` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ContactEvent_contactId_eventId_key" ON "ContactEvent"("contactId", "eventId");

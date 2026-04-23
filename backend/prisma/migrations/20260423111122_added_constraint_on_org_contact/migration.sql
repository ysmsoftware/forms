/*
  Warnings:

  - A unique constraint covering the columns `[id,organizationId]` on the table `Contact` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Contact_id_organizationId_key" ON "Contact"("id", "organizationId");

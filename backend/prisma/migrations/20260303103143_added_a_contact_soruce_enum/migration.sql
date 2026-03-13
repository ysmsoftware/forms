/*
  Warnings:

  - The `source` column on the `ContactEvent` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ContactEventSource" AS ENUM ('FORM_SUBMISSION', 'PAYMENT', 'MANUAL', 'OTHER');

-- AlterTable
ALTER TABLE "ContactEvent" DROP COLUMN "source",
ADD COLUMN     "source" "ContactEventSource";

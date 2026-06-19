-- CreateTable
CREATE TABLE "PartialSubmission" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "contactId" TEXT,
    "lastFieldKey" TEXT,
    "lastFieldOrder" INTEGER,
    "dropoffFieldKey" TEXT,
    "dropoffFieldOrder" INTEGER,
    "partialAnswers" JSONB NOT NULL,
    "contactSnapshot" JSONB,
    "isContactExtracted" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartialSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldDropoffStat" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "fieldLabel" TEXT NOT NULL,
    "fieldOrder" INTEGER NOT NULL,
    "dropoffCount" INTEGER NOT NULL DEFAULT 0,
    "date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldDropoffStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventTitle" TEXT NOT NULL,
    "exportedByUserId" TEXT NOT NULL,
    "exportedByName" TEXT NOT NULL,
    "exportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rowCount" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,

    CONSTRAINT "ExportLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartialSubmission_eventId_idx" ON "PartialSubmission"("eventId");

-- CreateIndex
CREATE INDEX "PartialSubmission_eventId_processedAt_idx" ON "PartialSubmission"("eventId", "processedAt");

-- CreateIndex
CREATE INDEX "PartialSubmission_contactId_idx" ON "PartialSubmission"("contactId");

-- CreateIndex
CREATE INDEX "PartialSubmission_dropoffFieldKey_idx" ON "PartialSubmission"("dropoffFieldKey");

-- CreateIndex
CREATE UNIQUE INDEX "PartialSubmission_visitorId_eventId_key" ON "PartialSubmission"("visitorId", "eventId");

-- CreateIndex
CREATE INDEX "FieldDropoffStat_eventId_idx" ON "FieldDropoffStat"("eventId");

-- CreateIndex
CREATE INDEX "FieldDropoffStat_eventId_date_idx" ON "FieldDropoffStat"("eventId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "FieldDropoffStat_eventId_fieldKey_date_key" ON "FieldDropoffStat"("eventId", "fieldKey", "date");

-- CreateIndex
CREATE INDEX "ExportLog_organizationId_idx" ON "ExportLog"("organizationId");

-- CreateIndex
CREATE INDEX "ExportLog_eventId_idx" ON "ExportLog"("eventId");

-- CreateIndex
CREATE INDEX "ExportLog_exportedAt_idx" ON "ExportLog"("exportedAt");

-- AddForeignKey
ALTER TABLE "PartialSubmission" ADD CONSTRAINT "PartialSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartialSubmission" ADD CONSTRAINT "PartialSubmission_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartialSubmission" ADD CONSTRAINT "PartialSubmission_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "Visitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartialSubmission" ADD CONSTRAINT "PartialSubmission_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldDropoffStat" ADD CONSTRAINT "FieldDropoffStat_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportLog" ADD CONSTRAINT "ExportLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportLog" ADD CONSTRAINT "ExportLog_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

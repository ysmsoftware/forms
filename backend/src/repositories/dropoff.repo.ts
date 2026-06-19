import { PartialSubmission, FieldDropoffStat } from "@prisma/client";
import { prisma } from "../config/db";

// ── Types ──────────────────────────────────────────────────────────────────────

export type PartialAnswer = {
    fieldId: string;
    fieldKey: string;
    fieldLabel?: string;
    fieldOrder?: number;
    value: string | number | boolean | null;
};

export type PartialContactSnapshot = {
    name?: string;
    email?: string;
    phone?: string;
};

export type PartialSubmissionWithContact = PartialSubmission & {
    contact: {
        id: string;
        name: string | null;
        email: string | null;
        phone: string | null;
    } | null;
};

export type DropoffFunnelEntry = {
    fieldKey: string;
    fieldLabel: string;
    fieldOrder: number;
    dropoffCount: number;
    dropoffRate: number; // % of starters who dropped off HERE
};

export interface IDropoffRepository {
    upsertPartialSubmission(data: {
        formId: string;
        eventId: string;
        visitorId: string;
        contactId?: string;
        lastFieldKey?: string;
        lastFieldOrder?: number;
        dropoffFieldKey?: string;
        dropoffFieldOrder?: number;
        partialAnswers: PartialAnswer[];
        contactSnapshot?: PartialContactSnapshot;
        isContactExtracted?: boolean;
    }): Promise<PartialSubmission>;

    findPartialsByEvent(params: {
        eventId: string;
        limit: number;
        cursor?: string;
        hasContact?: boolean;
    }): Promise<{ items: PartialSubmissionWithContact[]; nextCursor: string | null }>;

    countPartialsByEvent(eventId: string): Promise<number>;

    upsertFieldDropoffStat(data: {
        eventId: string;
        formId: string;
        fieldKey: string;
        fieldLabel: string;
        fieldOrder: number;
        date: Date;
        increment: number;
    }): Promise<void>;

    getFieldDropoffFunnel(eventId: string, fromDate: Date): Promise<DropoffFunnelEntry[]>;

    getExtractedContacts(params: {
        eventId: string;
        limit: number;
        cursor?: string;
    }): Promise<{ items: PartialSubmissionWithContact[]; nextCursor: string | null }>;
}


export class DropoffRepository implements IDropoffRepository {

    async upsertPartialSubmission(data: {
        formId: string;
        eventId: string;
        visitorId: string;
        contactId?: string;
        lastFieldKey?: string;
        lastFieldOrder?: number;
        dropoffFieldKey?: string;
        dropoffFieldOrder?: number;
        partialAnswers: PartialAnswer[];
        contactSnapshot?: PartialContactSnapshot;
        isContactExtracted?: boolean;
    }): Promise<PartialSubmission> {
        return prisma.partialSubmission.upsert({
            where: {
                visitorId_eventId: {
                    visitorId: data.visitorId,
                    eventId: data.eventId,
                },
            },
            create: {
                formId: data.formId,
                eventId: data.eventId,
                visitorId: data.visitorId,
                ...(data.contactId && { contactId: data.contactId }),
                lastFieldKey: data.lastFieldKey ?? null,
                lastFieldOrder: data.lastFieldOrder ?? null,
                dropoffFieldKey: data.dropoffFieldKey ?? null,
                dropoffFieldOrder: data.dropoffFieldOrder ?? null,
                partialAnswers: data.partialAnswers as any,
                contactSnapshot: data.contactSnapshot as any ?? null,
                isContactExtracted: data.isContactExtracted ?? false,
                processedAt: new Date(),
            },
            update: {
                // Upsert: re-process if they come back later with more data
                ...(data.contactId && { contactId: data.contactId }),
                lastFieldKey: data.lastFieldKey ?? null,
                lastFieldOrder: data.lastFieldOrder ?? null,
                dropoffFieldKey: data.dropoffFieldKey ?? null,
                dropoffFieldOrder: data.dropoffFieldOrder ?? null,
                partialAnswers: data.partialAnswers as any,
                contactSnapshot: data.contactSnapshot as any ?? null,
                isContactExtracted: data.isContactExtracted ?? false,
                processedAt: new Date(),
            },
        });
    }

    async findPartialsByEvent(params: {
        eventId: string;
        limit: number;
        cursor?: string;
        hasContact?: boolean;
    }): Promise<{ items: PartialSubmissionWithContact[]; nextCursor: string | null }> {
        const items = await prisma.partialSubmission.findMany({
            where: {
                eventId: params.eventId,
                ...(params.hasContact === true && { contactId: { not: null } }),
                ...(params.hasContact === false && { contactId: null }),
            },
            include: {
                contact: {
                    select: { id: true, name: true, email: true, phone: true },
                },
            },
            orderBy: { processedAt: "desc" },
            take: params.limit + 1,
            ...(params.cursor && { cursor: { id: params.cursor }, skip: 1 }),
        });

        let nextCursor: string | null = null;
        if (items.length > params.limit) {
            const next = items.pop()!;
            nextCursor = next.id;
        }

        return { items: items as PartialSubmissionWithContact[], nextCursor };
    }

    async countPartialsByEvent(eventId: string): Promise<number> {
        return prisma.partialSubmission.count({ where: { eventId } });
    }

    async upsertFieldDropoffStat(data: {
        eventId: string;
        formId: string;
        fieldKey: string;
        fieldLabel: string;
        fieldOrder: number;
        date: Date;
        increment: number;
    }): Promise<void> {
        // Normalize to UTC midnight for consistent daily bucketing
        const day = new Date(
            Date.UTC(data.date.getUTCFullYear(), data.date.getUTCMonth(), data.date.getUTCDate())
        );

        await prisma.fieldDropoffStat.upsert({
            where: {
                eventId_fieldKey_date: {
                    eventId: data.eventId,
                    fieldKey: data.fieldKey,
                    date: day,
                },
            },
            create: {
                eventId: data.eventId,
                formId: data.formId,
                fieldKey: data.fieldKey,
                fieldLabel: data.fieldLabel,
                fieldOrder: data.fieldOrder,
                dropoffCount: data.increment,
                date: day,
            },
            update: {
                dropoffCount: { increment: data.increment },
            },
        });
    }

    async getFieldDropoffFunnel(eventId: string, fromDate: Date): Promise<DropoffFunnelEntry[]> {
        // Aggregate drop-off counts grouped by field across the date range
        const rows = await prisma.fieldDropoffStat.groupBy({
            by: ["fieldKey", "fieldLabel", "fieldOrder"],
            where: {
                eventId,
                date: { gte: fromDate },
            },
            _sum: { dropoffCount: true },
            orderBy: { fieldOrder: "asc" },
        });

        // Get total starters for this event to compute rates
        const analytics = await prisma.eventAnalytics.findUnique({
            where: { eventId },
            select: { totalStarted: true },
        });

        const totalStarted = analytics?.totalStarted ?? 1;

        return rows.map((r) => ({
            fieldKey: r.fieldKey,
            fieldLabel: r.fieldLabel,
            fieldOrder: r.fieldOrder,
            dropoffCount: r._sum.dropoffCount ?? 0,
            dropoffRate: Number(
                (((r._sum.dropoffCount ?? 0) / totalStarted) * 100).toFixed(1)
            ),
        }));
    }

    async getExtractedContacts(params: {
        eventId: string;
        limit: number;
        cursor?: string;
    }): Promise<{ items: PartialSubmissionWithContact[]; nextCursor: string | null }> {
        // Only return partials where we have SOME contact info (either linked or snapshot)
        const items = await prisma.partialSubmission.findMany({
            where: {
                eventId: params.eventId,
                OR: [
                    { contactId: { not: null } },
                    // Has a contactSnapshot with email or phone
                    { contactSnapshot: { not: {} } },
                ],
                isContactExtracted: true,
            },
            include: {
                contact: {
                    select: { id: true, name: true, email: true, phone: true },
                },
            },
            orderBy: { processedAt: "desc" },
            take: params.limit + 1,
            ...(params.cursor && { cursor: { id: params.cursor }, skip: 1 }),
        });

        let nextCursor: string | null = null;
        if (items.length > params.limit) {
            const next = items.pop()!;
            nextCursor = next.id;
        }

        return { items: items as PartialSubmissionWithContact[], nextCursor };
    }
}
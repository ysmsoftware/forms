import {
    FormSubmission,
    SubmissionAnswer,
    Visitor,
    VisitSession,
    Contact,
    SubmissionStatus,
} from "@prisma/client";
import { prisma } from "../config/db";
import { ContactEventSource } from "@prisma/client";

export type SubmissionWithAnswers = FormSubmission & {
    answers: SubmissionAnswer[];
    contact: Contact | null;
    payment?: {
        id: string;
        status: string;
        amount: number;
        currency: string;
        razorpayPaymentId: string | null;
        paidAt: Date | null;
        webhookConfirmed: boolean;
        attempts: number;
    } | null;
};


export interface ISubmissionRepository {

    // visitor & session
    upsertVisitor(data: {
        uuid: string;
        ipAddress?: string;
        userAgent?: string;
    }): Promise<Visitor>;

    createVisitSession(data: {
        visitorId: string;
        eventId: string;
        status: SubmissionStatus;
    }): Promise<VisitSession>;

    updateSessionStatus(
        id: string,
        status: SubmissionStatus
    ): Promise<VisitSession>;

    createFullSubmission(data: {
        formId: string;
        eventId: string;
        visitorId: string;
        contactId?: string;
        status: SubmissionStatus;
        answers: {
            fieldId: string;
            fieldKey: string;
            valueText?: string;
            valueNumber?: number;
            valueBoolean?: boolean;
            valueDate?: Date;
            valueJson?: any;
            fileUrl?: string;
        }[];
    }): Promise<SubmissionWithAnswers>;

    // Admin Reads

    findSubmissionById(id: string): Promise<SubmissionWithAnswers | null>;
    findSubmissionsByEvent(
        eventId: string,
        options?: {
            status?: SubmissionStatus;
            limit?: number;
            offset?: number;
            formDate?: Date;
            toDate?: Date;
        }
    ): Promise<{ items: SubmissionWithAnswers[], totalCount: number }>;

    attachFilesToContact(params: {
        fileIds: string[];
        contactId: string;
    }): Promise<void>;

}

export class SubmissionsRepository implements ISubmissionRepository {

    // visitor & session
    async upsertVisitor(data: { uuid: string; ipAddress?: string; userAgent?: string; }): Promise<Visitor> {

        return prisma.visitor.upsert({
            where: { uuid: data.uuid },
            create: {
                uuid: data.uuid,
                ipAddress: data.ipAddress ?? null,
                userAgent: data.userAgent ?? null
            },
            update: {
                ipAddress: data.ipAddress ?? null,
                userAgent: data.userAgent ?? null,
                lastSeenAt: new Date()
            }
        });
    }

    async createVisitSession(data: { visitorId: string; eventId: string; status: SubmissionStatus }): Promise<VisitSession> {
        const order: Record<SubmissionStatus, number> = {
            VISITED: 1,
            STARTED: 2,
            SUBMITTED: 3,
        };

        // Atomic upsert — avoids race condition on duplicate rapid calls
        const session = await prisma.visitSession.upsert({
            where: {
                visitorId_eventId: {
                    visitorId: data.visitorId,
                    eventId: data.eventId,
                },
            },
            create: data,
            update: {},  // will be conditionally upgraded below
        });

        // Upgrade status only if the new status is higher
        if (order[data.status] > order[session.status]) {
            return prisma.visitSession.update({
                where: { id: session.id },
                data: { status: data.status },
            });
        }

        return session;
    }



    async updateSessionStatus(id: string, status: SubmissionStatus): Promise<VisitSession> {
        return prisma.visitSession.update({
            where: { id: id },
            data: {
                status: status
            }
        });
    }

    async createFullSubmission(data: { formId: string; eventId: string; visitorId: string; contactId?: string; status: SubmissionStatus; answers: { fieldId: string; fieldKey: string; valueText?: string; valueNumber?: number; valueBoolean?: boolean; valueDate?: Date; valueJson?: any; fileUrl?: string; }[]; }): Promise<SubmissionWithAnswers> {

        return prisma.$transaction(async (tx) => {

            const submission = await tx.formSubmission.create({
                data: {
                    formId: data.formId,
                    eventId: data.eventId,
                    visitorId: data.visitorId,
                    contactId: data.contactId ?? null,
                    status: data.status,
                },
            });

            await tx.submissionAnswer.createMany({
                data: data.answers.map((a) => ({
                    submissionId: submission.id,
                    fieldId: a.fieldId,
                    fieldKey: a.fieldKey,
                    valueText: a.valueText ?? null,
                    valueNumber: a.valueNumber ?? null,
                    valueBoolean: a.valueBoolean ?? null,
                    valueDate: a.valueDate ?? null,
                    valueJson: a.valueJson ?? null,
                    fileUrl: a.fileUrl ?? null,
                })),
            });

            // Upsert the Contact ↔ Event mapping so the Contacts tab
            // can later resolve which events a contact belongs to.
            if (data.contactId) {
                await tx.contactEvent.upsert({
                    where: {
                        contactId_eventId: {
                            contactId: data.contactId,
                            eventId: data.eventId,
                        },
                    },
                    create: {
                        contactId: data.contactId,
                        eventId: data.eventId,
                        source: ContactEventSource.FORM_SUBMISSION,
                    },
                    update: {}, // already mapped — nothing to change
                });
            }

            await tx.visitSession.updateMany({
                where: {
                    visitorId: data.visitorId,
                    eventId: data.eventId,
                },
                data: { status: "SUBMITTED" }
            })

            const fullSubmission = await tx.formSubmission.findUnique({
                where: { id: submission.id },
                include: { answers: true },
            });

            return fullSubmission as SubmissionWithAnswers;

        })
    }


    // admin reads

    async findSubmissionById(id: string): Promise<SubmissionWithAnswers | null> {
        return prisma.formSubmission.findFirst({
            where: { id: id },
            include: {
                answers: { orderBy: { fieldKey: "asc" } },
                contact: true,
                payment: {
                    select: {
                        id: true,
                        status: true,
                        amount: true,
                        currency: true,
                        razorpayPaymentId: true,
                        paidAt: true,
                        webhookConfirmed: true,
                        attempts: true,
                    }
                },
            }
        }) as Promise<SubmissionWithAnswers | null>
    };

    async findSubmissionsByEvent(eventId: string, options?: { status?: SubmissionStatus; limit?: number; offset?: number; fromDate?: Date; toDate?: Date; }): Promise<{ items: SubmissionWithAnswers[], totalCount: number }> {
        const where = {
            eventId,
            isDeleted: false,
            ...(options?.status && { status: options.status }),
            ...(options?.fromDate || options?.toDate
                ? {
                    submittedAt: {
                        ...(options.fromDate && { gte: options.fromDate }),
                        ...(options.toDate && { lte: options.toDate }),
                    }
                } : {}
            ),
        };

        const [items, totalCount] = await prisma.$transaction([
            prisma.formSubmission.findMany({
                where,
                ...(options?.limit && { take: options.limit }),
                ...(options?.offset && { skip: options.offset }),
                include: {
                    answers: {
                        orderBy: { fieldKey: "asc" }
                    },
                    contact: true,
                    payment: {
                        select: {
                            id: true,
                            status: true,
                            amount: true,
                            currency: true,
                            razorpayPaymentId: true,
                            paidAt: true,
                            webhookConfirmed: true,
                            attempts: true,
                        }
                    },
                }
            }),
            prisma.formSubmission.count({ where })
        ]);

        return { items: items as SubmissionWithAnswers[], totalCount };
    }

    async attachFilesToContact(params: {
        fileIds: string[];
        contactId: string;
    }) {
        await prisma.fileAsset.updateMany({
            where: {
                id: { in: params.fileIds },
                contactId: null,
            },
            data: { contactId: params.contactId },
        });
    }

}
import { Event, EventStatus, PaymentConfig, CertificateTemplateType } from "@prisma/client";
import { prisma } from "../config/db";

export type EventWithConfig = Event & {
    paymentConfig: PaymentConfig | null;
};

// event.repo.ts
export type CreateEventInput = Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'> & {
    paymentConfig?: {
        amount: number;
        currency: string;
        description?: string | null;
    } | null;
};

export interface IEventRepository {
    createEvent(data: CreateEventInput): Promise<EventWithConfig>;
    update(id: string, data: any): Promise<EventWithConfig>;
    findBySlug(slug: string): Promise<EventWithConfig | null>;
    findById(id: string): Promise<EventWithConfig | null>;
    findByIds(id: string[]): Promise<EventWithConfig[]>;
    findByOrganization(organizationId: string): Promise<EventWithConfig[]>;
    findByUser(userId: string): Promise<EventWithConfig[]>;
    findByContactId(contactId: string): Promise<EventWithConfig[]>;
    publish(id: string): Promise<EventWithConfig>;
    close(id: string): Promise<EventWithConfig>;
    markAsDeleted(id: string): Promise<EventWithConfig>;
    findActiveEvents(): Promise<EventWithConfig[]>;
    getEventPaymentConfig(eventId: string): Promise<PaymentConfig | null>;
    duplicateEvent(id: string, newTitle: string, newSlug: string): Promise<EventWithConfig>;

}

export class EventRepository implements IEventRepository {

    async createEvent(data: CreateEventInput): Promise<EventWithConfig> {
        const { paymentConfig, ...eventData } = data;

        return prisma.event.create({
            data: {
                ...eventData,
                ...(paymentConfig && {
                    paymentConfig: { create: paymentConfig }
                })
            },
            include: { paymentConfig: true }
        }) as Promise<EventWithConfig>;
    }

    async findBySlug(slug: string): Promise<EventWithConfig | null> {
        return prisma.event.findUnique({
            where: { slug },
            include: { paymentConfig: true }
        }) as Promise<EventWithConfig | null>;
    }

    async findById(id: string): Promise<EventWithConfig | null> {
        return prisma.event.findUnique({
            where: { id, isDeleted: false },
            include: { paymentConfig: true }
        }) as Promise<EventWithConfig | null>;
    }

    async findByIds(ids: string[]): Promise<EventWithConfig[]> {
        return prisma.event.findMany({
            where: {
                id: { in: ids },
                isDeleted: false
            },
            include: { paymentConfig: true }
        }) as Promise<EventWithConfig[]>;
    }

    async findByOrganization(organizationId: string): Promise<EventWithConfig[]> {
        return prisma.event.findMany({
            where: { organizationId, isDeleted: false },
            include: { paymentConfig: true },
            orderBy: { createdAt: "desc" }
        }) as Promise<EventWithConfig[]>;
    }

    async findByUser(userId: string): Promise<EventWithConfig[]> {
        return prisma.event.findMany({
            where: { userId, isDeleted: false },
            include: { paymentConfig: true },
            orderBy: { createdAt: "desc" }
        }) as Promise<EventWithConfig[]>;
    }

    async findByContactId(contactId: string): Promise<EventWithConfig[]> {
        return prisma.event.findMany({
            where: {
                isDeleted: false,
                contactEvents: {
                    some: { contactId }
                }
            },
            include: { paymentConfig: true },
            orderBy: { createdAt: "desc" }
        }) as Promise<EventWithConfig[]>;
    }

    async update(id: string, data: any): Promise<EventWithConfig> {
        const { paymentConfig, ...eventData } = data;

        return prisma.event.update({
            where: { id },
            data: {
                ...eventData,
                ...(paymentConfig && {
                    paymentConfig: {
                        upsert: {
                            create: {
                                amount: paymentConfig.amount ?? 0,
                                currency: paymentConfig.currency ?? "INR",
                                description: paymentConfig.description,
                            },
                            update: paymentConfig,
                        }
                    }
                })
            },
            include: { paymentConfig: true }
        }) as Promise<EventWithConfig>;
    }

    async publish(id: string): Promise<EventWithConfig> {
        return prisma.event.update({
            where: { id },
            data: { status: "ACTIVE" },
            include: { paymentConfig: true }
        }) as Promise<EventWithConfig>;
    }

    async close(id: string): Promise<EventWithConfig> {
        return prisma.event.update({
            where: { id },
            data: { status: "CLOSED" },
            include: { paymentConfig: true }
        }) as Promise<EventWithConfig>;
    }

    async markAsDeleted(id: string): Promise<EventWithConfig> {
        return prisma.event.update({
            where: { id },
            data: { isDeleted: true },
            include: { paymentConfig: true }
        }) as Promise<EventWithConfig>;
    }

    async findActiveEvents(): Promise<EventWithConfig[]> {
        return prisma.event.findMany({
            where: { status: EventStatus.ACTIVE, isDeleted: false },
            include: { paymentConfig: true }
        }) as Promise<EventWithConfig[]>;
    }

    async getEventPaymentConfig(eventId: string): Promise<PaymentConfig | null> {
        return prisma.paymentConfig.findUnique({
            where: { eventId }
        });
    }

    async duplicateEvent(id: string, newTitle: string, newSlug: string): Promise<EventWithConfig> {
        return prisma.$transaction(async (tx) => {
            // Fetch source event with form, steps, and fields
            const source = await tx.event.findUnique({
                where: { id, isDeleted: false },
                include: {
                    paymentConfig: true,
                    form: {
                        include: {
                            steps: {
                                include: { fields: { orderBy: { order: 'asc' } } },
                                orderBy: { stepNumber: 'asc' },
                            },
                            fields: {
                                where: { stepId: null },
                                orderBy: { order: 'asc' },
                            },
                        },
                    },
                },
            });

            if (!source) throw new Error('Source event not found');

            // Create the new event (status = DRAFT)
            const newEvent = await tx.event.create({
                data: {
                    userId: source.userId,
                    organizationId: source.organizationId,
                    title: newTitle,
                    slug: newSlug,
                    description: source.description,
                    status: 'DRAFT',
                    templateType: source.templateType,
                    date: source.date,
                    link: `${process.env.DOMAIN}/form/${newSlug}`,
                    bannerUrl: source.bannerUrl,
                    paymentEnabled: source.paymentEnabled,
                    ...(source.paymentConfig && {
                        paymentConfig: {
                            create: {
                                amount: source.paymentConfig.amount,
                                currency: source.paymentConfig.currency,
                                description: source.paymentConfig.description,
                            },
                        },
                    }),
                },
                include: { paymentConfig: true },
            });

            // Deep-copy the form if it exists
            if (source.form) {
                const form = await tx.form.create({
                    data: {
                        eventId: newEvent.id,
                        isMultiStep: source.form.isMultiStep,
                        settings: source.form.settings ?? {},
                        // publishedAt intentionally omitted → stays null (draft)
                    },
                });

                if (source.form.isMultiStep && source.form.steps.length > 0) {
                    for (const step of source.form.steps) {
                        const newStep = await tx.formStep.create({
                            data: {
                                formId: form.id,
                                stepNumber: step.stepNumber,
                                title: step.title,
                                description: step.description,
                            },
                        });
                        if (step.fields.length > 0) {
                            await tx.formField.createMany({
                                data: step.fields.map((f) => ({
                                    formId: form.id,
                                    stepId: newStep.id,
                                    key: f.key,
                                    type: f.type,
                                    label: f.label,
                                    required: f.required,
                                    order: f.order,
                                    options: f.options ?? {},
                                    validation: f.validation ?? {},
                                })),
                            });
                        }
                    }
                } else if (!source.form.isMultiStep && source.form.fields && source.form.fields.length > 0) {
                    await tx.formField.createMany({
                        data: source.form.fields.map((f) => ({
                            formId: form.id,
                            key: f.key,
                            type: f.type,
                            label: f.label,
                            required: f.required,
                            order: f.order,
                            options: f.options ?? {},
                            validation: f.validation ?? {},
                        })),
                    });
                }
            }

            return newEvent as EventWithConfig;
        });
    }
}

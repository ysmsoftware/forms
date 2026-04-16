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
    findByUser(userId: string): Promise<EventWithConfig[]>;
    findByContactId(contactId: string): Promise<EventWithConfig[]>;
    publish(id: string): Promise<EventWithConfig>;
    close(id: string): Promise<EventWithConfig>;
    markAsDeleted(id: string): Promise<EventWithConfig>;
    findActiveEvents(): Promise<EventWithConfig[]>;
    getEventPaymentConfig(eventId: string): Promise<PaymentConfig | null>;
    
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
            where: { slug, isDeleted: false },
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
                id: { in: ids}, 
                isDeleted: false 
            },
            include: { paymentConfig: true}
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
}

import { MessageLog, MessageStatus, MessageType } from "@prisma/client";
import { prisma } from "../config/db";

export type MessageLogWithRelations = MessageLog & {
    contact: {
        id: string;
        name: string | null;
        email: string | null;
        phone: string | null;
    } | null;
    event?: {
        id: string;
        title: string;
    } | null;
}


export interface IMessageRepository {

    create(data: {
        organizationId: string;
        contactId: string;
        eventId?: string;
        type: MessageType;
        template: string;
        params?: any;
    }): Promise<MessageLog>;

    updateStatus(
        id: string,
        status: MessageStatus,
        options?: { providerResponse?: any; errorMessage?: string; }
    ): Promise<MessageLog>;

    incrementAttempt(id: string): Promise<void>;

    findById(id: string): Promise<MessageLogWithRelations | null>;

    getMessages(params: {
        organizationId: string;
        contactId?: string,
        eventId?: string,
        email?: string,
        phone?: string,
        options?: { limit?: number, offset?: number }
    }
    ): Promise<MessageLogWithRelations[]>

    findFailedMessages(organizationId: string): Promise<MessageLog[] | null>

}


export class MessageRepository implements IMessageRepository {

    async create(data: {
        organizationId: string;
        contactId: string;
        eventId?: string;
        type: MessageType;
        template: string;
        params?: any;
    }): Promise<MessageLog> {

        return prisma.messageLog.create({
            data: {
                ...data,
                status: 'QUEUED'
            }
        });
    }

    async updateStatus(

        id: string,
        status: MessageStatus,
        options?: {
            providerResponse?: any;
            errorMessage?: string;
        }): Promise<MessageLog> {

        return prisma.messageLog.update({
            where: { id },
            data: {
                status,
                ...(status === 'SENT' && { sentAt: new Date() }),
                ...(options?.providerResponse && { providerResponse: options.providerResponse }),
                ...(options?.errorMessage && { errorMessage: options.errorMessage }),
            }
        });
    }

    async incrementAttempt(id: string): Promise<void> {
        await prisma.messageLog.update({
            where: { id },
            data: {
                attemptCount: { increment: 1 }
            }
        })
    }

    async findById(id: string): Promise<MessageLogWithRelations | null> {
        return prisma.messageLog.findUnique({
            where: { id },
            include: {
                contact: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                    }
                },
                event: {
                    select: {
                        id: true,
                        title: true,
                    }
                }
            }
        })
    }

    async getMessages(params: {
        organizationId: string,
        contactId?: string,
        eventId?: string,
        email?: string,
        phone?: string,
        options?: { limit?: number; offset?: number; }
    }): Promise<MessageLogWithRelations[]> {


        const filters = [
            ...(params.contactId ? [{ contactId: params.contactId }] : []),
            ...(params.eventId ? [{ eventId: params.eventId }] : []),
            ...(params.email ? [{ contact: { email: params.email } }] : []),
            ...(params.phone ? [{ contact: { phone: params.phone } }] : []),
        ]

        return prisma.messageLog.findMany({
            where: {
                organizationId: params.organizationId,
                ...(params.contactId && { contactId: params.contactId }),
                ...(params.eventId && { eventId: params.eventId }),
                ...(params.email && { contact: { email: params.email } }),
                ...(params.phone && { contact: { phone: params.phone } }),
                isDeleted: false
            },
            include: {
                contact: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                    }
                },
                event: {
                    select: {
                        id: true,
                        title: true,
                    }
                }
            },
            orderBy: { createdAt: "desc" },
            take: params.options?.limit ?? 20,
            skip: params.options?.offset ?? 0,
        });
    }

    async findFailedMessages(organizationId: string): Promise<MessageLog[] | null> { 
        return await prisma.messageLog.findMany({
            where: {
                status: "FAILED",
                organizationId,
                AND: [
                    { attemptCount: { gte: 3 }, }                    
                ]

            }
        });    
        
    }

} 
import { Contact, ContactTag, ContactEvent, Tag } from "@prisma/client";
import { prisma } from "../config/db";

// Rich contact type returned by listContacts — includes tags and linked events
export type ContactWithRelations = Contact & {
    tags: (ContactTag & { tag: Tag })[];
    contactEvents: Pick<ContactEvent, 'eventId' | 'source'>[];
};

export interface IContactRepository {

    createContact(data: {
        organizationId: string;
        name?: string;
        email?: string;
        phone?: string;
    }): Promise<Contact>;

    updateContact(data: {
        organizationId: string;
        id: string
        name?: string;
        email?: string;
        phone?: string;
    }): Promise<Contact>;

    createManyContact(data: {
        organizationId: string;
        name?: string;
        email?: string;
        phone?: string;
    }[]): Promise<number>;

    softDeleteContact(organizationId: string, id: string): Promise<void>;
    restoreContact(organizationId: string, id: string): Promise<void>;

    findById(organizationId: string, id: string): Promise<Contact | null>;
    findByEmail(organizationId: string, email: string): Promise<Contact | null>;
    findByPhone(organizationId: string, phone: string): Promise<Contact | null>;

    findContactByEmailOrPhone(
        organizationId: string,
        email?: string,
        phone?: string
    ): Promise<Contact | null>;

    /**
     * Returns all event IDs linked to a contact via ContactEvent.
     * Used to auto-resolve eventId when sending messages from the Contacts tab.
     */
    findByIdWithRelations(organizationId: string, id: string): Promise<ContactWithRelations | null>;

    findEventIdsByContactId(contactId: string): Promise<string[]>;

    findByIdOrThrow(organizationId: string, id: string): Promise<Contact>;

    existsById(organizationId: string, id: string): Promise<boolean>;

    findByIdIncludingDeleted(organizationId: string, id: string): Promise<Contact | null>;

    listContacts(params: {
        organizationId: string;
        search?: string;
        lastId?: string;
        take?: number;
    }): Promise<ContactWithRelations[]>;

    countContacts(organizationId: string, search?: string): Promise<number>;

}


export class ContactRepository implements IContactRepository {

    async createContact(data: { organizationId: string; name?: string; email?: string; phone?: string; }): Promise<Contact> {
        return prisma.contact.create({
            data
        });
    }

    async updateContact(data: { organizationId: string; id: string, name?: string; email?: string; phone?: string; }): Promise<Contact> {
        return prisma.contact.update({
            where: { id: data.id },
            data: {
                ...(data.name !== undefined && { name: data.name}),
                ...(data.email !== undefined && { email: data.email}),
                ...(data.phone !== undefined && { phone: data.phone}),
            }
        });
    }

    async createManyContact(data: { 
        organizationId: string;
        name?: string; 
        email?: string; 
        phone?: string; 
    }[]): Promise<number> {
        
        const result = await prisma.contact.createMany({
            data,
            skipDuplicates: true,
        });

        return result.count;
    }

    async softDeleteContact(organizationId: string,id: string): Promise<void> {
        await prisma.contact.update({
            where: {
                id,
                organizationId
            },
            data: {
                isDeleted: true,
            }
        })
    }
    async restoreContact(organizationId: string, id: string): Promise<void> {
        await prisma.contact.update({
            where: { id, organizationId },
            data: { isDeleted: false }
        })
    }

    async findById(organizationId: string, id: string): Promise<Contact | null> {
        return prisma.contact.findFirst({
            where: { 
                id,
                organizationId,
                isDeleted: false,
             }
        });
    }

    async findByEmail(organizationId:string, email: string): Promise<Contact | null> {
        return prisma.contact.findFirst({
            where: { 
                organizationId,
                email, 
                isDeleted: false,
            }
        });
    }

    async findByPhone(organizationId:string, phone: string): Promise<Contact | null> {
        return prisma.contact.findFirst({
            where: { 
                organizationId,
                phone,
                isDeleted: false,
            }
        });
    }

    async findContactByEmailOrPhone(organizationId: string, email?: string, phone?: string): Promise<Contact | null> {
        if (!email && !phone) return null;

        return prisma.contact.findFirst({
            where: {
                organizationId,
                OR: [
                    ...(email ? [{ email }] : []),
                    ...(phone ? [{ phone }] : [])
                ],
                isDeleted: false,
            }
        });
    }

    async findByIdWithRelations(organizationId: string, id: string): Promise<ContactWithRelations | null> {
        return prisma.contact.findFirst({
            where: { id, organizationId, isDeleted: false },
            include: {
                tags: { include: { tag: true } },
                contactEvents: { select: { eventId: true, source: true } },
            },
        });
    }

    async findEventIdsByContactId(contactId: string): Promise<string[]> {
        const rows = await prisma.contactEvent.findMany({
            where: { contactId },
            select: { eventId: true },
        });
        return rows.map((r) => r.eventId);
    }

    async findByIdOrThrow(organizationId: string, id: string): Promise<Contact> {
        return await prisma.contact.findFirstOrThrow({
            where: { id, organizationId, isDeleted: false }
        })
    }

    async existsById(organizationId: string, id: string): Promise<boolean> {
        const record = await prisma.contact.findUnique({
            where: { id, organizationId, isDeleted: false }
        })

        return record !== null;
    }

    async findByIdIncludingDeleted(organizationId: string, id: string): Promise<Contact | null> {
        return await prisma.contact.findUnique({
            where: { id, organizationId }
        })
    }

    async listContacts(params: { 
        organizationId: string;
        search?: string; 
        lastId?: string; 
        take?: number; 
    }): Promise<ContactWithRelations[]> {
        
        const  { search, lastId, take = 20 } = params;

        return await prisma.contact.findMany({
            where: {
                organizationId: params.organizationId,
                isDeleted: false,
                ...(search && {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' }},
                        { email: { contains: search, mode: 'insensitive' }},
                        { phone: { contains: search, mode: 'insensitive' }},
                    ],
                }),
            },
            include: {
                tags: {
                    include: { tag: true }
                },
                contactEvents: {
                    select: { eventId: true, source: true }
                }
            },
            orderBy: { createdAt: "desc" },
            ...(lastId && {
                cursor: { id: lastId },
                skip: 1,
            }),
            take,
        });
    }

    async countContacts(organizationId:string, search?: string): Promise<number> {
        return prisma.contact.count({
            where: {
                organizationId,
                isDeleted: false,
                ...(search && {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' }},
                        { email: { contains: search, mode: 'insensitive' }},
                        { phone: { contains: search, mode: 'insensitive' }},
                    ]
                })
            }
        })
    }

}
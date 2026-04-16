import { Contact, ContactTag, ContactEvent, Tag } from "@prisma/client";
import { prisma } from "../config/db";

// Rich contact type returned by listContacts — includes tags and linked events
export type ContactWithRelations = Contact & {
    tags: (ContactTag & { tag: Tag })[];
    contactEvents: Pick<ContactEvent, 'eventId' | 'source'>[];
};

export interface IContactRepository {

    createContact(data: {
        name?: string;
        email?: string;
        phone?: string;
    }): Promise<Contact>;

    updateContact(data: {
        id: string
        name?: string;
        email?: string;
        phone?: string;
    }): Promise<Contact>;

    createManyContact(data: {
        name?: string;
        email?: string;
        phone?: string;
    }[]): Promise<number>;

    softDeleteContact(id: string): Promise<void>;
    restoreContact(id: string): Promise<void>;

    findById(id: string): Promise<Contact | null>;
    findByEmail(email: string): Promise<Contact | null>;
    findByPhone(phone: string): Promise<Contact | null>;

    findContactByEmailOrPhone(
        email?: string,
        phone?: string
    ): Promise<Contact | null>;

    /**
     * Returns all event IDs linked to a contact via ContactEvent.
     * Used to auto-resolve eventId when sending messages from the Contacts tab.
     */
    findByIdWithRelations(id: string): Promise<ContactWithRelations | null>;

    findEventIdsByContactId(contactId: string): Promise<string[]>;

    findByIdOrThrow(id: string): Promise<Contact>;

    existsById(id: string): Promise<boolean>;

    findByIdIncludingDeleted(id: string): Promise<Contact | null>;

    listContacts(params: {
        search?: string;
        lastId?: string;
        take?: number;
    }): Promise<ContactWithRelations[]>;

    countContacts(search?: string): Promise<number>;

}


export class ContactRepository implements IContactRepository {

    async createContact(data: { name?: string; email?: string; phone?: string; }): Promise<Contact> {
        return prisma.contact.create({
            data
        });
    }

    async updateContact(data: { id: string, name?: string; email?: string; phone?: string; }): Promise<Contact> {
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

    async softDeleteContact(id: string): Promise<void> {
        await prisma.contact.update({
            where: {
                id
            },
            data: {
                isDeleted: true,
            }
        })
    }
    async restoreContact(id: string): Promise<void> {
        await prisma.contact.update({
            where: { id },
            data: { isDeleted: false }
        })
    }

    async findById(id: string): Promise<Contact | null> {
        return prisma.contact.findFirst({
            where: { 
                id,
                isDeleted: false,
             }
        });
    }

    async findByEmail(email: string): Promise<Contact | null> {
        return prisma.contact.findFirst({
            where: { 
                email, 
                isDeleted: false,
            }
        });
    }

    async findByPhone(phone: string): Promise<Contact | null> {
        return prisma.contact.findFirst({
            where: { 
                phone,
                isDeleted: false,
            }
        });
    }

    async findContactByEmailOrPhone(email?: string, phone?: string): Promise<Contact | null> {
        if (!email && !phone) return null;

        return prisma.contact.findFirst({
            where: {
                OR: [
                    ...(email ? [{ email }] : []),
                    ...(phone ? [{ phone }] : [])
                ],
                isDeleted: false,
            }
        });
    }

    async findByIdWithRelations(id: string): Promise<ContactWithRelations | null> {
        return prisma.contact.findFirst({
            where: { id, isDeleted: false },
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

    async findByIdOrThrow(id: string): Promise<Contact> {
        return await prisma.contact.findUniqueOrThrow({
            where: { id, isDeleted: false }
        })
    }

    async existsById(id: string): Promise<boolean> {
        const record = await prisma.contact.findUnique({
            where: { id, isDeleted: false }
        })

        return record !== null;
    }

    async findByIdIncludingDeleted(id: string): Promise<Contact | null> {
        return await prisma.contact.findUnique({
            where: { id }
        })
    }

    async listContacts(params: { 
        search?: string; 
        lastId?: string; 
        take?: number; 
    }): Promise<ContactWithRelations[]> {
        
        const  { search, lastId, take = 20 } = params;

        return await prisma.contact.findMany({
            where: {
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

    async countContacts(search?: string): Promise<number> {
        return prisma.contact.count({
            where: {
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
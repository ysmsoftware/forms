import { PaymentStatus } from "@prisma/client";
import { BadRequestError, ConflictError, NotFoundError } from "../errors/http-errors";
import { ICertificateRepository } from "../repositories/certificate.repo";
import { ContactWithRelations, IContactRepository } from "../repositories/contact.repo";
import { IEventRepository } from "../repositories/event.repo";
import { IFileRepository } from "../repositories/file.repo";
import { IMessageRepository } from "../repositories/message.repo";
import { IPaymentRepository } from "../repositories/payment.repo";
import { ITagRepository } from "../repositories/tag.repo";


export class ContactService { 

    constructor(
        private contactRepo: IContactRepository,
        private eventRepo: IEventRepository,
        private certificateRepo: ICertificateRepository,
        private paymentRepo: IPaymentRepository,
        private messageRepo: IMessageRepository,
        private tagRepo: ITagRepository,
        private fileRepo: IFileRepository,
    ) { }

    async createContact(input: {
        organizationId: string;
        name?: string;
        email?: string;
        phone?: string; 
    }) {
        if(!input.email && !input.phone) {
            throw new BadRequestError("Email or phone is required");
        }

        const existing = await this.contactRepo.findContactByEmailOrPhone(input.organizationId, input.email, input.phone);
        if (existing) {
            const field = existing.email === input.email ? `email (${input.email})` : `phone (${input.phone})`;
            throw new ConflictError(`A contact with this ${field} already exists`);
        }

        return this.contactRepo.createContact(input);
    }

    async updateContact(
        organizationId: string,
        id: string,
        input: {
            name?: string;
            email?: string;
            phone?: string;
        }
    ) {
        const existing = await this.contactRepo.findById( organizationId, id);
        if(!existing) {
            throw  new NotFoundError("Contact not found");
        }

        return this.contactRepo.updateContact({ id, organizationId, ...input });
    }

    async bulkCreateContacts(data: {
        organizationId: string;
        name?: string;
        email?: string;
        phone?: string; 
    }[]) {

        if(!data.length) {
            throw new BadRequestError("Empty contact list");
        }

        return this.contactRepo.createManyContact(data);
    }

    async deleteContact(id: string, organizationId: string) {
        const contact = await this.contactRepo.findById(id, organizationId);
        if(!contact) {
            throw new  NotFoundError("Contact not found")
        }

        await this.contactRepo.softDeleteContact(organizationId, id);
    }

    async restoreContact(id: string, organizationId: string) {
        const contact = await this.contactRepo.findByIdIncludingDeleted(id, organizationId);
        if(!contact) {
            throw new NotFoundError("Contact not found");
        }
        await this.contactRepo.restoreContact(id, organizationId);
    }

    async listContacts(params: {
        organizationId: string;
        search?: string;
        lastId?: string;
        take?: number;
    }): Promise<{ total: number; contacts: ContactWithRelations[] }> {

        const [contacts, total] = await Promise.all([
            this.contactRepo.listContacts(params),
            this.contactRepo.countContacts(params.organizationId, params.search),
        ]);

        return { total, contacts };
    }

    async getContactById(id: string, organizationId: string) {
        const contact = await this.contactRepo.findByIdWithRelations(id, organizationId);
        if (!contact) {
            throw new NotFoundError("Contact not found");
        }
        return contact;
    }

    async getContactEventIds(contactId:string, organizationId: string) {
        
        const contact = await this.contactRepo.findById(contactId, organizationId);
        if(!contact) {
             throw new NotFoundError("Contact not found");
        }

        return this.contactRepo.findEventIdsByContactId(contactId);
    }
    
    async getContactEvents(id: string, organizationId: string) {

        await this.contactRepo.findByIdOrThrow(organizationId, id);
        
        const events = await this.eventRepo.findByContactId(id);
        return { 
            events,
            total: events.length
        }
    }

    async getContactCertificates(id: string, organizationId: string, params?: { limit?: number; cursor?: string }) {
        
        await this.contactRepo.findByIdOrThrow(organizationId, id);
    
        const { items, total, nextCursor } = await this.certificateRepo.findByContactId(
            id, 
            params?.limit ?? 20, 
            params?.cursor
        );

        return {
            certificates: items,
            total,
            nextCursor
        }
        
    }

    async getContactPayments(id: string, organizationId: string, params?: { limit?: number; cursor?: string; status?: string }) {
        await this.contactRepo.findByIdOrThrow(organizationId, id);
        
        const payments = await this.paymentRepo.allPayments({ 
            organizationId,
            contactId: id, 
            limit: params?.limit ?? 20,
            ...(params?.status && { status: params.status as PaymentStatus }),
            ...(params?.cursor && { cursor: params.cursor }), 
        });
        
        return {
            payments,
            total: payments.items.length ?? 0
        }

    }

    async getContactMessages(id: string, organizationId: string, options: { limit?: number; offset?: number; }) { 
        await this.contactRepo.findByIdOrThrow(organizationId, id);

        const messages = await this.messageRepo.getMessages({ 
            organizationId,
            contactId: id,
            options,
        })

        return {
            messages,
            total: messages.length ?? 0
        }
    }

    async getContactTags(id: string, organizationId: string) {
        await this.contactRepo.findByIdOrThrow(organizationId, id);

        const tags = await this.tagRepo.findTagsByContactIds(id);
        
        return {
            tags,
            total: tags.length
        };
    }

    async getContactFiles(id: string, organizationId: string) {

        await this.contactRepo.findByIdOrThrow(organizationId, id);

        const files = await this.fileRepo.findByContactId(id, organizationId);

        return {
            files,
            total: files.length ?? 0
        }

    }

}
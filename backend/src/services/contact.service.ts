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
        name?: string;
        email?: string;
        phone?: string; 
    }) {
        if(!input.email && !input.phone) {
            throw new BadRequestError("Email or phone is required");
        }

        const existing = await this.contactRepo.findContactByEmailOrPhone(input.email, input.phone);
        if (existing) {
            const field = existing.email === input.email ? `email (${input.email})` : `phone (${input.phone})`;
            throw new ConflictError(`A contact with this ${field} already exists`);
        }

        return this.contactRepo.createContact(input);
    }

    async updateContact(
        id: string,
        input: {
            name?: string;
            email?: string;
            phone?: string;
        }
    ) {
        const existing = await this.contactRepo.findById(id);
        if(!existing) {
            throw  new NotFoundError("Contact not found");
        }

        return this.contactRepo.updateContact({ id, ...input });
    }

    async bulkCreateContacts(data: {
        name?: string;
        email?: string;
        phone?: string; 
    }[]) {

        if(!data.length) {
            throw new BadRequestError("Empty contact list");
        }

        return this.contactRepo.createManyContact(data);
    }

    async deleteContact(id: string) {
        const contact = await this.contactRepo.findById(id);
        if(!contact) {
            throw new  NotFoundError("Contact not found")
        }

        await this.contactRepo.softDeleteContact(id);
    }

    async restoreContact(id: string) {
        const contact = await this.contactRepo.findByIdIncludingDeleted(id);
        if(!contact) {
            throw new NotFoundError("Contact not found");
        }
        await this.contactRepo.restoreContact(id);
    }

    async listContacts(params: {
        search?: string;
        lastId?: string;
        take?: number;
    }): Promise<{ total: number; contacts: ContactWithRelations[] }> {

        const [contacts, total] = await Promise.all([
            this.contactRepo.listContacts(params),
            this.contactRepo.countContacts(params.search),
        ]);

        return { total, contacts };
    }

    async getContactById(id: string) {
        const contact = await this.contactRepo.findByIdWithRelations(id);
        if (!contact) {
            throw new NotFoundError("Contact not found");
        }
        return contact;
    }

    async getContactEventIds(contactId:string) {
        
        const contact = await this.contactRepo.findById(contactId);
        if(!contact) {
             throw new NotFoundError("Contact not found");
        }

        return this.contactRepo.findEventIdsByContactId(contactId);
    }
    
    async getContactEvents(id: string) {

        await this.contactRepo.findByIdOrThrow(id);
        
        const events = await this.eventRepo.findByContactId(id);
        return { 
            events,
            total: events.length
        }
    }

    async getContactCertificates(id: string, params?: { limit?: number; cursor?: string }) {
        
        await this.contactRepo.findByIdOrThrow(id);
    
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

    async getContactPayments(id: string, params?: { limit?: number; cursor?: string; status?: string }) {
        await this.contactRepo.findByIdOrThrow(id);
        
        const payments = await this.paymentRepo.allPayments({ 
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

    async getContactMessages(id: string, options: { limit?: number; offset?: number; }) { 
        await this.contactRepo.findByIdOrThrow(id);

        const messages = await this.messageRepo.getMessages({ 
            contactId: id,
            options,
        })

        return {
            messages,
            total: messages.length ?? 0
        }
    }

    async getContactTags(id: string) {
        await this.contactRepo.findByIdOrThrow(id);

        const tags = await this.tagRepo.findTagsByContactIds(id);
        
        return {
            tags,
            total: tags.length
        };
    }

    async getContactFiles(id: string) {

        await this.contactRepo.findByIdOrThrow(id);

        const files = await this.fileRepo.findByContactId(id);

        return {
            files,
            total: files.length ?? 0
        }

    }

}
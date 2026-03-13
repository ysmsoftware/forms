import { BadRequestError, ConflictError, NotFoundError } from "../errors/http-errors";
import { ContactWithRelations, IContactRepository } from "../repositories/contact.repo";
import { ITagRepository } from "../repositories/tag.repo";


export class ContactService { 

    constructor(
        private contactRepo: IContactRepository,
        private tagRepo: ITagRepository
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
}
import { BadRequestError, NotFoundError } from "../errors/http-errors";
import { IContactRepository } from "../repositories/contact.repo";
import { ITagRepository } from "../repositories/tag.repo";

export class TagService {

    constructor(
        private tagRepo: ITagRepository,
        private contactRepo: IContactRepository
    ) { }

    async createTag(name: string) {
        if(!name.trim()) {
            throw new BadRequestError("Tag name is required");
        }
        return this.tagRepo.createTag(name.trim());
    }
    async listTags() {
        return this.tagRepo.listTags();
    }

    async findTagById(tagId: string) {
        const tag = await this.tagRepo.findTagById(tagId);
        if(!tag) {
            throw new NotFoundError("Tag not found");
        }
        return tag;
    }

    async addTagToContact(contactId: string, tagId: string) {
        
        const contact = await this.contactRepo.findById(contactId);
        if(!contact) {
            throw new NotFoundError("Contact not found");
        }

        const tag = await this.tagRepo.findTagById(tagId);
            if(!tag) {
                throw new BadRequestError("Tag not found");
            }

        await this.tagRepo.addTagToContact(contactId, tagId);
    }

    async removeTagFromContact(contactId: string, tagId: string) {
        const contact = await this.contactRepo.findById(contactId);
        if (!contact) {
            throw new NotFoundError("Contact not found");
        }
        // removeTagFromContact will throw P2025 if the tag isn't assigned — catch and rethrow cleanly
        try {
            await this.tagRepo.removeTagFromContact(contactId, tagId);
        } catch (err: any) {
            if (err?.code === "P2025") {
                throw new NotFoundError("Tag is not assigned to this contact");
            }
            throw err;
        }
    }

    async bulkAddTagToContacts(tagId: string, contactIds: string[]) {

        if(!contactIds.length) throw new BadRequestError("No contacts provided");

        const tag = await this.tagRepo.findTagById(tagId);
        if(!tag) {
            throw new NotFoundError("Tag not found");
        }

        await Promise.allSettled(
            contactIds.map(id => this.tagRepo.addTagToContact(id, tagId))
        )
    }

    async getContactIdsByTag(tagId: string) {
        return this.tagRepo.findContactIdsByTag(tagId);
    }

}
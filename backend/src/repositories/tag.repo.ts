import { ContactTag, Tag } from "@prisma/client";
import { prisma } from "../config/db";


export interface ITagRepository {

    createTag(organizationId: string, name: string): Promise<Tag>;
    listTags(organizationId: string): Promise<Tag[]>;

    findTagById(organizationId: string, tagId: string): Promise<Tag | null>;

    addTagToContact(
        contactId: string,
        tagId: string,
    ): Promise<void>;

    removeTagFromContact(
        contactId: string,
        tagId: string,
    ): Promise<void>;

    findContactIdsByTag(tagId: string): Promise<ContactTag[]>;
    findTagsByContactIds(contactId: string): Promise<ContactTag[]>;

}

export class TagRepository implements ITagRepository {
     
    async createTag(organizationId: string, name: string): Promise<Tag> {
        return await prisma.tag.upsert({
            where: { organizationId_name: { organizationId, name } },
            create: { organizationId, name },
            update: {},
        });
    }

    async findTagById(organizationId: string, tagId: string): Promise<Tag | null> {
        return await prisma.tag.findFirst({
            where: {
                id: tagId,
                organizationId
            }
        });
    }

    async listTags(organizationId: string): Promise<Tag[]> {
        return await prisma.tag.findMany({
            where: { organizationId }
        });
    }
    async addTagToContact(contactId: string, tagId: string): Promise<void> {
        await prisma.contactTag.upsert({
            where: { contactId_tagId: { contactId, tagId } },
            create: { contactId, tagId },
            update: {},
        });
    }

    async removeTagFromContact(contactId: string, tagId: string): Promise<void> {
        await prisma.contactTag.delete({
            where: {
                contactId_tagId: { contactId, tagId},
            }
        })
    }

    async findContactIdsByTag(tagId: string): Promise<ContactTag[]> {
        return await prisma.contactTag.findMany({
            where:{
                tagId
            }
        })
    }

    async findTagsByContactIds(contactId: string): Promise<ContactTag[]> {
        return await prisma.contactTag.findMany({
            where: {
                 contactId
            },
            include: {
                tag: true
            }
        })
    }

}
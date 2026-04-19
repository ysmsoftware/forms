import { ContactTag, Tag } from "@prisma/client";
import { prisma } from "../config/db";


export interface ITagRepository {

    createTag(name: string): Promise<Tag>;
    listTags(): Promise<Tag[]>;

    findTagById(tagId: string): Promise<Tag | null>;

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
     
    async createTag(name: string): Promise<Tag> {
        return await prisma.tag.upsert({
            where: { name },
            create: { name },
            update: {},
        });
    }

    async findTagById(tagId: string): Promise<Tag | null> {
        return await prisma.tag.findUnique({
            where: {
                id: tagId
            }
        });
    }

    async listTags(): Promise<Tag[]> {
        return await prisma.tag.findMany({});
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
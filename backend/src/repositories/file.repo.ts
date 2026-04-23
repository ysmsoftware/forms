import { prisma } from "../config/db";
import { FileAsset } from "@prisma/client";

export interface IFileRepository {

    create(data: {
        organizationId?: string,
        url: string;
        storageKey: string;
        mimeType: string;
        name: string;
        size: number;
        context: string;
        fieldKey?: string;
        contactId?: string;
        eventId?: string;
        visitorId?: string;
        expiresAt?: Date;
    }): Promise<FileAsset>;

    findById(id: string, organizationId: string,): Promise<FileAsset | null>;

    findByContactId(contactId: string, organizationId: string,): Promise<FileAsset[]>;

    findByEventId(eventId: string, organizationId: string,): Promise<FileAsset[]>;

    deleteById(id: string, organizationId: string,): Promise<FileAsset | null>;

    updateContactIdByUrls(urls: string[], contactId: string): Promise<number>;

}



export class FileRepository implements IFileRepository {

    async create(data: {
        organizationId?: string,
        url: string;
        storageKey: string;
        mimeType: string;
        name: string;
        size: number;
        context: string;
        fieldKey?: string;
        contactId?: string;
        eventId?: string;
        visitorId?: string;
        expiresAt?: Date;
    }): Promise<FileAsset> {
        return prisma.fileAsset.create({ data });
    }

    async findById(id: string, organizationId: string,): Promise<FileAsset | null> {
        return prisma.fileAsset.findUnique({
            where: { id, organizationId},
        });
    }

    async findByContactId(contactId: string, organizationId: string,): Promise<FileAsset[]> {
        return prisma.fileAsset.findMany({
            where: { contactId, organizationId},
            orderBy: { createdAt: "desc" },
        });
    }

    async findByEventId(eventId: string, organizationId: string,): Promise<FileAsset[]> {
        return prisma.fileAsset.findMany({
            where: { eventId, organizationId, },
            orderBy: { createdAt: "desc" },
        });
    }

    async deleteById(id: string, organizationId: string,): Promise<FileAsset | null> {
        return prisma.fileAsset.delete({
            where: { id, organizationId, },
        });
    }

    async updateContactIdByUrls(urls: string[], contactId: string): Promise<number> {
        const result = await prisma.fileAsset.updateMany({
            where: {
                url: { in: urls },
                contactId: null,
            },
            data: { contactId },
        });
        return result.count;
    }


}
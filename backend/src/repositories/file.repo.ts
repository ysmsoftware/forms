import { prisma } from "../config/db";
import { FileAsset  } from "@prisma/client";

export interface IFileRepository {
    
    create(data: {
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

    findById(id: string): Promise<FileAsset | null>;

    findByContactId(contactId: string): Promise<FileAsset[]>;

    findByEventId(eventId: string): Promise<FileAsset[]>;

    deleteById(id: string): Promise<FileAsset | null>;
}



export class FileRepository implements IFileRepository {

    async create(data: {
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

    async findById(id: string): Promise<FileAsset | null> {
        return prisma.fileAsset.findUnique({
            where: { id },
        });
    }

    async findByContactId(contactId: string): Promise<FileAsset[]> {
        return prisma.fileAsset.findMany({
            where: { contactId },
            orderBy: { createdAt: "desc" },
        });
    }

    async findByEventId(eventId: string): Promise<FileAsset[]> {
        return prisma.fileAsset.findMany({
            where: { eventId },
            orderBy: { createdAt: "desc" },
        });
    }

    async deleteById(id: string): Promise<FileAsset | null> {
        return prisma.fileAsset.delete({
            where: { id },
        });
    }

}
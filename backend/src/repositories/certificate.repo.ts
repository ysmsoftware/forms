import { Certificate, CertificateStatus, CertificateTemplateType, Prisma } from "@prisma/client";
import { prisma } from "../config/db";

export type CertificateWithRelations = Certificate & {
    contact: {
        id: string;
        name: string | null;
        email: string | null;
        phone: string | null;
    } | null;
    event: {
        id: string;
        title: string;
        description: string | null;
        slug: string;
        date: Date | null;
        createdAt: Date;
    } | null;
    fileAsset: {
        id: string;
        url: string;
        name: string;
    } | null;
}


export interface ICertificateRepository {

    create(data: {
        submissionId: string;
        contactId?: string;
        eventId?: string;
        status: CertificateStatus;
        fileAssetId?: string;
        templateType: CertificateTemplateType;
    }): Promise<Certificate>;

    createDirect(data: {
        contactId: string;
        templateType: CertificateTemplateType;
        status: CertificateStatus;
    }): Promise<Certificate>;


    findAll(filters: {
        eventId?: string;
        status?: CertificateStatus;
        templateType?: CertificateTemplateType;
        contactName?: string;
        dateFrom?: Date;
        dateTo?: Date;
        page?: number;
        limit?: number;
    }): Promise<{ items: CertificateWithRelations[]; total: number }>;

    findById(id: string): Promise<CertificateWithRelations | null>;

    findBySubmissionId(submissionId: string): Promise<Certificate | null>;

    findByEventId(eventId: string, page?: number, limit?: number): Promise<{ items: CertificateWithRelations[], total: number }>;

    updateStatus(
        id: string,
        status: CertificateStatus,
        fileAssetId?: string
    ): Promise<Certificate>;
}

export class CertificateRepository implements ICertificateRepository {

    async create(data: { 
        submissionId: string; 
        contactId?: string; 
        eventId?: string; 
        status: CertificateStatus;
        fileAssetId?: string;
        templateType: CertificateTemplateType;
    }): Promise<Certificate> {
        return await prisma.certificate.create({ data });
    }

    async createDirect(data: {
        contactId: string;
        templateType: CertificateTemplateType;
        status: CertificateStatus;
    }): Promise<Certificate> {
        return await prisma.certificate.create({ data: data as any });
    }


    async findAll(filters: {
        eventId?: string;
        status?: CertificateStatus;
        templateType?: CertificateTemplateType;
        contactName?: string;
        dateFrom?: Date;
        dateTo?: Date;
        page?: number;
        limit?: number;
    }): Promise<{ items: CertificateWithRelations[]; total: number }> {
        const page  = filters.page  ?? 1;
        const limit = filters.limit ?? 25;
        const skip  = (page - 1) * limit;

        const where: Prisma.CertificateWhereInput = {
            isDeleted: false,
            ...(filters.eventId      && { eventId:      filters.eventId }),
            ...(filters.status       && { status:       filters.status }),
            ...(filters.templateType && { templateType: filters.templateType }),
            ...(filters.contactName  && {
                contact: { name: { contains: filters.contactName, mode: "insensitive" } },
            }),
            ...((filters.dateFrom || filters.dateTo) && {
                issuedAt: {
                    ...(filters.dateFrom && { gte: filters.dateFrom }),
                    ...(filters.dateTo   && { lte: filters.dateTo }),
                },
            }),
        };

        const [items, total] = await Promise.all([
            prisma.certificate.findMany({
                where,
                include: this.certInclude,
                orderBy: { issuedAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.certificate.count({ where }),
        ]);

        return { items, total };
    }

    private readonly certInclude = {
        contact: {
            select: { id: true, name: true, email: true, phone: true },
        },
        event: {
            select: { id: true, title: true, description: true, slug: true, date: true, createdAt: true },
        },
        fileAsset: {
            select: { id: true, url: true, name: true },
        },
    } as const;

    async findById(id: string): Promise<CertificateWithRelations | null> {
        return await prisma.certificate.findUnique({
            where: { id },
            include: this.certInclude,
        });
    }

    async findByEventId(eventId: string, page?: number, limit?: number): Promise<{ items: CertificateWithRelations[], total: number }> {
        const pageNum = page ?? 1;
        const limitNum = limit ?? 20;
        const skip = (pageNum - 1) * limitNum;

        const [items, total] = await Promise.all([
            prisma.certificate.findMany({
                where: { eventId, isDeleted: false },
                include: this.certInclude,
                orderBy: { issuedAt: 'desc' },
                skip,
                take: limitNum,
            }),
            prisma.certificate.count({ where: { eventId, isDeleted: false } }),
        ]);

        return { items, total };
    }

    async findBySubmissionId(submissionId: string): Promise<Certificate | null> {
        return await prisma.certificate.findUnique({
            where: { submissionId }
        });
    }   

    async updateStatus(id: string, status: CertificateStatus, fileAssetId?: string): Promise<Certificate> {
        return await prisma.certificate.update({
            where: { id },
           data: {
            status,
            ...(fileAssetId && { fileAssetId }),
            ...(status === "GENERATED" && { issuedAt: new Date() })
           }
        })
    }
}
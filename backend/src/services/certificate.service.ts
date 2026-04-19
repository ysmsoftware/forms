import { NotFoundError } from '../errors/http-errors';
import { certificateQueue } from '../queues/certificate.queue';
import { ISubmissionRepository } from '../repositories/submission.repo';
import { ICertificateRepository } from './../repositories/certificate.repo';
import { EventService } from './event.service';
import { IContactRepository } from '../repositories/contact.repo';
import { CertificateTemplateType, CertificateStatus } from '@prisma/client';
import { CertificateWithRelations } from '../repositories/certificate.repo';
import pLimit from 'p-limit';


type IssueResult =
    | { submissionId: string; success: true; data: any }
    | { submissionId: string; success: false; error: Error };

export class CertificateService {
    constructor(
        private certificateRepo: ICertificateRepository,
        private submissionRepo: ISubmissionRepository,
        private eventService: EventService,
        private contactRepo: IContactRepository
    ) { }

    async issueCertificates(
        submissionIds: string[],
        paramOverrides?: Record<string, string>
    ): Promise<IssueResult[]> {

        const results: IssueResult[] = [];
        const batchSize = 50;
        const limit = pLimit(5);

        for (let i = 0; i < submissionIds.length; i += batchSize) {

            const batch = submissionIds.slice(i, i + batchSize);

            const batchResults = await Promise.all(
                batch.map(submissionId => limit(async () => {
                    try {
                        const data = await this.issueCertificate(submissionId, paramOverrides);
                        return { submissionId, success: true as const, data };
                    } catch (error) {
                        return { submissionId, success: false as const, error: error as Error };
                    }
                }))
            );

            results.push(...batchResults);
        }

        return results;
    }

    private async issueCertificate(submissionId: string, paramOverrides?: Record<string, string>) {
        const submission = await this.submissionRepo.findSubmissionById(submissionId);
        if (!submission) {
            throw new NotFoundError("Submission not found");
        }

        const existing = await this.certificateRepo.findBySubmissionId(submissionId);
        if (existing && existing.status === 'GENERATED') {
            return existing;
        }

        if (!existing) {
            const event = await this.eventService.findbyId(submission.eventId);
            if (!event) {
                throw new NotFoundError("Event not found");
            }

            const certificate = await this.certificateRepo.create({
                submissionId,
                ...(submission.contactId && { contactId: submission.contactId }),
                eventId: submission.eventId,
                status: 'QUEUED',
                templateType: event.templateType,
            });

            await certificateQueue.add(
                "generate-certificate",
                { certificateId: certificate.id, paramOverrides },
                { jobId: certificate.id },
            );
            return certificate;
        }

        // Existing but not GENERATED (FAILED/QUEUED) — re-queue
        await this.ensureJobExists(existing.id, paramOverrides);
        return existing;
    }

    private async ensureJobExists(certificateId: string, paramOverrides?: Record<string, string>) {
        const job = await certificateQueue.getJob(certificateId);

        if (!job) {
            await certificateQueue.add(
                "generate-certificate",
                { certificateId, paramOverrides },
                { jobId: certificateId }
            );
            return;
        }

        const state = await job.getState();

        if (state === 'failed') {
            await job.remove();
            await certificateQueue.add(
                "generate-certificate",
                { certificateId, paramOverrides },
                { jobId: certificateId }
            );
            return;
        }

    }
    
    async getAll(filters: {
        eventId?: string;
        status?: CertificateStatus;
        templateType?: CertificateTemplateType;
        contactName?: string;
        dateFrom?: Date;
        dateTo?: Date;
        page?: number;
        limit?: number;
    }): Promise<{
        items: ReturnType<CertificateService['mapCert']>[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const page  = filters.page  ?? 1;
        const limit = filters.limit ?? 25;

        const { items, total } = await this.certificateRepo.findAll({ ...filters, page, limit });

        return {
            items: items.map(cert => this.mapCert(cert)),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    private mapCert = (cert: CertificateWithRelations) => {
        return {
            id:           cert.id,
            submissionId: cert.submissionId,
            status:       cert.status,
            templateType: cert.templateType,
            issuedAt:     cert.issuedAt,
            event: cert.event
                ? { id: cert.event.id, title: cert.event.title }
                : null,
            contact: cert.contact
                ? { id: cert.contact.id, name: cert.contact.name, email: cert.contact.email }
                : null,
            fileUrl:  cert.fileAsset?.url  ?? null,
            fileName: cert.fileAsset?.name ?? null,
        };
    }

    async getByEventId(eventId: string, page?: number, limit?: number) {
        const pageNum = page ?? 1;
        const limitNum = limit ?? 20;
        const { items, total } = await this.certificateRepo.findByEventId(eventId, pageNum, limitNum);
        return {
            items: items.map(cert => this.mapCert(cert)),
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
        };
    }

    async findById(certificateId: string) {

        const certificate = await this.certificateRepo.findById(certificateId);

        if (!certificate) {
            throw new NotFoundError("Certificate not found");
        }

        const data = {
            valid: certificate.status === "GENERATED",
            status: certificate.status,
            issuedTo: certificate.contact?.name ?? null,
            email: certificate.contact?.email ?? null,
            event: certificate.event?.title ?? "Unknown Event",
            issuedAt: certificate.issuedAt,
        }

        return data;
    }

    async resolveCertificateParams(submissionId: string): Promise<{
        resolved: Record<string, string>;
        missing: string[];
    }> {
        const submission = await this.submissionRepo.findSubmissionById(submissionId);
        if (!submission) {
            throw new NotFoundError("Submission not found");
        }

        const event = await this.eventService.findbyId(submission.eventId);
        if (!event) {
            throw new NotFoundError("Event not found");
        }

        const resolved: Record<string, string> = {};
        const missing: string[] = [];

        // name
        const name = submission.contact?.name ?? "";
        resolved.name = name;
        if (!name.trim()) missing.push("name");

        // eventTitle
        const eventTitle = event.title ?? "";
        resolved.eventTitle = eventTitle;
        if (!eventTitle.trim()) missing.push("eventTitle");

        // date
        const date = event.createdAt
            ? new Date(event.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
            })
            : "";
        resolved.date = date;
        if (!date.trim()) missing.push("date");

        return { resolved, missing };
    }

    private readonly TEMPLATE_REQUIRED_FIELDS: Record<string, string[]> = {
        ACHIEVEMENT: ["achievementTitle"],
        APPOINTMENT: ["position", "startDate", "probation", "location"],
        COMPLETION:  ["eventTitle"],
        INTERNSHIP:  ["domain", "startDate", "endDate"],
        WORKSHOP:    ["workshopTitle"],
    };

    private readonly TEMPLATE_OPTIONAL_FIELDS: Record<string, string[]> = {
        ACHIEVEMENT: ["description", "signatoryName"],
        APPOINTMENT: ["companyName", "salary"],
        COMPLETION:  [],
        INTERNSHIP:  ["signatoryName", "signatoryTitle"],
        WORKSHOP:    [],
    };

    async resolveParamsForTemplate(
        contactId: string,
        templateType: string
    ): Promise<{ resolved: Record<string, string>; missing: string[] }> {
        const contact = await this.contactRepo.findById(contactId);
        if (!contact) throw new NotFoundError("Contact not found");

        const today = new Date().toLocaleDateString("en-US", {
            year: "numeric", month: "long", day: "numeric",
        });

        // Auto-resolved from contact/system
        const resolved: Record<string, string> = {
            name: contact.name ?? "",
            date: today,
        };

        // Required fields the user must fill
        const requiredFields = this.TEMPLATE_REQUIRED_FIELDS[templateType] ?? [];
        const optionalFields = this.TEMPLATE_OPTIONAL_FIELDS[templateType] ?? [];

        // Add optional fields to resolved as empty (user can fill or leave blank)
        for (const field of optionalFields) {
            resolved[field] = "";
        }

        // Required fields go in resolved (empty) AND missing
        const missing: string[] = [];
        for (const field of requiredFields) {
            resolved[field] = "";
            missing.push(field);
        }

        return { resolved, missing };
    }

    async issueDirectCertificate(
        contactId: string,
        templateType: CertificateTemplateType,
        paramOverrides: Record<string, string>
    ): Promise<{ id: string; status: string }> {
        const contact = await this.contactRepo.findById(contactId);
        if (!contact) throw new NotFoundError("Contact not found");

        const certificate = await this.certificateRepo.createDirect({
            contactId,
            templateType,
            status: "QUEUED",
        });

        // Pass ALL params (resolved + user overrides merged by the caller)
        // Worker will use paramOverrides since there's no event to resolve from
        await certificateQueue.add(
            "generate-certificate",
            { certificateId: certificate.id, paramOverrides },
            { jobId: certificate.id }
        );

        return { id: certificate.id, status: "QUEUED" };
    }

}
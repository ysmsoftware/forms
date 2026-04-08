import { ICertificateRepository } from "../repositories/certificate.repo";
import { CertificateGeneratorService } from "../services/certificate-generator.service";
import { FileService } from "../services/file.service";
import { FileContext } from "../types/file-context.enum";
import { resolveTemplate } from "../templates/template-registry";
import logger from "../config/logger";

export class CertificateWorkerService {

    constructor(
        private certificateRepo: ICertificateRepository,
        private fileService: FileService,
        private generator: CertificateGeneratorService
    ) { }

    async generate(jobData: { certificateId: string; paramOverrides?: Record<string, string> }) {

        const certificate = await this.certificateRepo.findById(jobData.certificateId);
        if (!certificate) throw new Error("Certificate not found");

        if (certificate?.status === "GENERATED") {
            logger.info(`Certificate ${certificate.id} already generated, skipping.`);
            return;
        }


        try {
            await this.certificateRepo.updateStatus(certificate.id, "PROCESSING");

            const template = resolveTemplate(certificate.templateType);

            const eventDate = certificate.event?.date
                ? new Date(certificate.event.date)
                : certificate.event?.createdAt
                    ? new Date(certificate.event.createdAt)
                    : null;

            const dateStr = eventDate
                ? eventDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
                : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

            // Build data object from contact + event — no submission.answers needed
            const data = {
                name: certificate.contact?.name ?? "Participant",
                email: certificate.contact?.email ?? "",
                phone: certificate.contact?.phone ?? "",
                eventTitle: certificate.event?.title ?? "",
                workshopTitle: certificate.event?.title ?? "",
                description: certificate.event?.description ?? "",
                date: dateStr,
                certificateId: certificate.id,
                ...jobData.paramOverrides,
            };

            const pdfBuffer = await this.generator.generate({
                data,
                template,
                certificateId: certificate.id,
                baseUrl: process.env.FRONTEND_URL || "http://localhost:3000"
            });

            const filename = [
                certificate.event?.title ?? certificate.templateType,
                certificate.contact?.name ?? "participant",
            ].join("-").replace(/\s+/g, "_").toLowerCase() + ".pdf";

            const isDirectIssue = !certificate.eventId;

            const uploaded = await this.fileService.upload({
                file: bufferToMulter(pdfBuffer, filename),
                context: isDirectIssue
                    ? FileContext.DIRECT_CERTIFICATE
                    : FileContext.FORM_CERTIFICATE,
                ...(certificate.eventId && { eventId: certificate.eventId }),
                ...(certificate.event?.slug && { eventSlug: certificate.event.slug }),
                ...(certificate.contactId && { contactId: certificate.contactId }),
            });

            logger.info(`Certificate ${certificate.id} generated and uploaded as file ${uploaded.id}`);
            await this.certificateRepo.updateStatus(certificate.id, "GENERATED", uploaded.id);

        } catch (error) {
            await this.certificateRepo.updateStatus(certificate.id, "FAILED");
            throw error;
        }
    }
}

function bufferToMulter(buffer: Buffer, filename: string): Express.Multer.File {
    return {
        fieldname: "file",
        originalname: filename,
        encoding: "7bit",
        mimetype: "application/pdf",
        buffer,
        size: buffer.length,
        stream: null as any,
        destination: "",
        filename: "",
        path: ""
    };
}
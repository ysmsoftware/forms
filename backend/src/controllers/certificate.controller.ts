import { BadRequestError } from "../errors/http-errors";
import { CertificateService } from "../services/certificate.service";
import { NextFunction, Request, Response } from 'express';

export class CertificateController {
    constructor(private certificateService: CertificateService) { }

    issue = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { organizationId } = req.user!;
            const { submissionId, submissionIds, paramOverrides } = req.body;

            if (!submissionId && (!submissionIds || !Array.isArray(submissionIds) || submissionIds.length === 0)) {
                throw new BadRequestError("submissionId or submissionIds[] is required to issue certificate(s)");
            }

            const ids: string[] = submissionId
                ? [submissionId]
                : [...new Set<string>(submissionIds)];

            const isBulk = !submissionId;
            const results = await this.certificateService.issueCertificates(organizationId, ids, paramOverrides);

            const summary = {
                total: results.length,
                queued: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length,
            };

            // Single — preserve original flat response shape
            if (!isBulk) {
                const single = results[0];
                if (!single) {
                    throw new BadRequestError("No result returned for submission");
                }
                if (!single.success) {
                    throw single.error;
                }
                return res.status(202).json({
                    message: "Certificate queued",
                    data: single.data,
                });
            }

            // Bulk
            return res.status(202).json({
                message: "Bulk certificate generation queued",
                summary,
                results: results.map(r => ({
                    submissionId: r.submissionId,
                    success: r.success,
                    ...(r.success ? { data: r.data } : { error: r.error.message }),
                })),
            });
        } catch (error) {
            next(error);
        }
    };

    getAll = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { organizationId } = req.user!;
            const {
                eventId,
                status,
                templateType,
                contactName,
                dateFrom,
                dateTo,
                page,
                limit,
            } = req.query;

            const filters: any = {};
            if (eventId) filters.eventId = eventId;
            if (status) filters.status = status;
            if (templateType) filters.templateType = templateType;
            if (contactName) filters.contactName = contactName;
            if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
            if (dateTo) filters.dateTo = new Date(dateTo as string);
            if (page) filters.page = Number(page);
            if (limit) filters.limit = Number(limit);

            const result = await this.certificateService.getAll(organizationId, filters);

            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    };

    getByEvent = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { organizationId } = req.user!;
            const { eventId } = req.params;
            const { page, limit } = req.query;

            if (!eventId || typeof eventId !== 'string') {
                return res.status(400).json({ success: false, message: 'eventId is required' });
            }

            const pageNum = page ? Number(page) : 1;
            const limitNum = limit ? Number(limit) : 20;

            const result = await this.certificateService.getByEventId( organizationId ,eventId, pageNum, limitNum);

            return res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    // Verify is intentionally public (no auth), no org scope
    // Used for QR code verification use case
    verify = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { certificateId } = req.query;

            if (!certificateId || typeof certificateId !== 'string') {
                return res.status(400).json({
                    message: "certificate is required"
                });
            }

            const certificate = await this.certificateService.findById(certificateId);

            if (!certificate) {
                return res.status(404).json({ message: "Certificate not found" });
            }

            return res.status(200).json({
                success: true,
                data: certificate
            });

        } catch (error) {
            next(error);
        }


    }

    resolveParams = async (req: Request, res: Response, next: NextFunction) => {
        try {
             const { organizationId } = req.user!;
            const { submissionId } = req.body;
            if (!submissionId) {
                return res.status(400).json({ success: false, message: "submissionId is required" });
            }
            const result = await this.certificateService.resolveCertificateParams(organizationId, submissionId);
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    };

    resolveParamsForTemplate = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { organizationId } = req.user!;
            const { contactId, templateType } = req.body;
            if (!contactId || !templateType) {
                return res.status(400).json({ success: false, message: "contactId and templateType are required" });
            }
            const result = await this.certificateService.resolveParamsForTemplate(organizationId, contactId, templateType);
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    };

    issueDirect = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { organizationId } = req.user!;
            const { contactId, templateType, paramOverrides } = req.body;
            if (!contactId || !templateType) {
                throw new BadRequestError("contactId and templateType are required");
            }
            const result = await this.certificateService.issueDirectCertificate(
                organizationId,
                contactId,
                templateType,
                paramOverrides ?? {}
            );
            return res.status(202).json({ message: "Certificate queued", data: result });
        } catch (error) {
            next(error);
        }
    };

}
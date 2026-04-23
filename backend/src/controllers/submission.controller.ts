import { Request, Response, NextFunction } from "express";
import { SubmissionService } from "../services/submissions.service";

export class SubmissionController {

    constructor(private submissionService: SubmissionService) {}

    getPublicForm = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const slug = req.params.slug 
            
            if (!slug) {
                return res.status(400).json({ error: 'Slug parameter is required' });
            }

            const result = await this.submissionService.getPublicForm(slug as string);
            return res.status(200).json({
                success: true,
                data: result
            });

        } catch (error) {
            next(error);
        }
    }

   recordVisit = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const slug = req.params.slug;
            
            if (!slug || Array.isArray(slug)) {
                return res.status(400).json({ error: 'Valid slug parameter is required' });
            }

            const uuid = req.body.visitor?.uuid; // Fixed typo: vistor -> visitor
            
            if (!uuid) {
                return res.status(400).json({ error: 'Visitor UUID is required' });
            }
            const ipAddress = 
            (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
            || req.ip
            || undefined;

            const visitor = {
                uuid,
                userAgent: req.headers["user-agent"] || 'unknown',
                ipAddress: ipAddress || 'unknown'
            };

            await this.submissionService.recordVisit({ slug, visitor });

            return res.status(200).json({ success: true });

        } catch (error) {
            next(error);
        }
    }

    startSubmission = async (req: Request, res: Response, next: NextFunction) => {
        try{ 
            const slug = req.params.slug;
            if (!slug || Array.isArray(slug)) {
                return res.status(400).json({ error: 'Valid slug parameter is required' });
            }
            const uuid = req.body.visitor.uuid;
            if (!uuid) {
                return res.status(400).json({ error: 'Visitor UUID is required' });
            }
            const visitor = { uuid };

            await this.submissionService.startSubmission({slug, visitor});

            res.status(200).json({ success: true });

        } catch (error) {
            next(error);
        }
    }

    submitForm = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const slug = req.params.slug;

            if(!slug || Array.isArray(slug)) {
                return res.status(400).json({ error: "valid slug parameter is required" });
            }

            const visitorUuid = req.body.visitor?.uuid;
            if(!visitorUuid) {
                return res.status(400).json({ error: "Visitor UUID is required" }); // Fixed typo: "os" -> "is"
            }

            // Extract and validate IP address
            const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
                || req.ip
                || req.socket.remoteAddress;

            if(!ipAddress) {
                return res.status(400).json({ error: "IP address could not be determined" });
            }

            // Extract and validate user agent
            const userAgent = req.headers["user-agent"];
            
            if(!userAgent) {
                return res.status(400).json({ error: "User agent is required" });
            }

            const input = {
                slug,
                visitor: {
                    uuid: visitorUuid,
                    ipAddress,
                    userAgent,
                },
                contact: req.body.contact,
                answers: req.body.answers,
            };

            const result = await this.submissionService.submitForm(input);

            return res.status(201).json({ success: true, data: result });

        } catch(error) {
            next(error);
        }
    }
    // Drafts are stored in Redis with TTL (eg: 24h)
    saveDraft = async(req: Request, res: Response, next: NextFunction) => {
        try {
            const slug = req.params.slug;
            const visitorUuid = req.body.visitor?.uuid;

            if(!slug || !visitorUuid) {
                return res.status(400).json({ error: "Slug & visitor UUID required" });
            }

            const draft = {
                answers: req.body.answers,
                contact: req.body.contact,
                updatedAt: new Date().toISOString(),
            }

            await this.submissionService.saveDraft(slug as string, visitorUuid, draft);
        
            return res.status(200).json({ success: true });

        } catch(error) {
            next(error);
        }
    }

    getDraft = async(req: Request, res: Response, next: NextFunction) => {
        try{
            const slug = req.params.slug;
            const visitorUuid = req.query.visitorUuid as string;

            if(!slug || !visitorUuid) {
                return res.status(400).json({ error: "Slug & visitor UUID required" });
            }

            const draft = await this.submissionService.getDraft(slug as string, visitorUuid);

            return res.status(200).json({
                success: true,
                data: draft ?? null,
            });

        } catch(error) {
            next(error);
        }
    }

    getSubmissionById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { organizationId } = req.user!;
            const submissionId = req.params.id;
            if (!submissionId || Array.isArray(submissionId)) {
                return res.status(400).json({ error: 'Valid id parameter is required' });
            }

            const result = await this.submissionService.getSubmissionById(submissionId, organizationId);


            return res.status(200).json({ success: true, data: result});

        } catch(error) {
            next(error);
        }
    }

    getSubmissionByEvent = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { organizationId } = req.user!;
            const eventId = req.params.id;
            if (!eventId || Array.isArray(eventId)) {
                return res.status(400).json({ error: 'Valid eventid parameter is required' });
            }

            const status = (req.query.status as string) || 'ALL';
            const limit = parseInt(req.query.limit as string) || 20;
            const offset = parseInt(req.query.offset as string) || 0;
        
            const validStatuses = ['ALL', 'VISITED', 'STARTED', 'SUBMITTED'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ error: 'Invalid status value' });
            }

            const filters = {
                status: status as 'ALL' | 'VISITED' | 'STARTED' | 'SUBMITTED',
                limit,
                offset,
                ...(req.query.fromDate && { fromDate: new Date(req.query.fromDate as string) }),
                ...(req.query.toDate && { toDate: new Date(req.query.toDate as string) })
            };

            const result = await this.submissionService.getSubmissionsByEvent(eventId, organizationId,  filters); 

            return res.status(200).json(result);
            
        } catch(error) {
            next(error);
        }
    }
}
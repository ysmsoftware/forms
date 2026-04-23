import { Request, Response, NextFunction } from "express";
import { MessageService } from "../services/message.service";
import { BadRequestError } from "../errors/http-errors";

export class MessageController {

    constructor(private messageService: MessageService) { }

    send = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { organizationId } = req.user!;
            const { contactId, eventId, type, template, params } = req.body;

            if (!contactId || !type || !template) {
                throw new BadRequestError("contactId, type, template required");
            }

            const result = await this.messageService.sendMessage({
                organizationId,
                contactId,
                eventId,
                type,
                template,
                params
            });

            return res.status(202).json({
                success: true,
                message: "Message queued",
                data: result
            })

        } catch (error) {
            next(error);
        }
    }

    resolveParams = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { organizationId } = req.user!;
            const { contactId, eventId, template } = req.body

            if (!contactId || !template) {
                return res.status(400).json({ success: false, message: "contactId and template are required" })
            }

            const result = await this.messageService.resolveParams({
                organizationId,
                contactId,
                eventId,
                template,
            })

            return res.status(200).json({ success: true, data: result })
        } catch (error) {
            next(error)
        }
    }

    getMessages = async (req: Request, res: Response, next: NextFunction) => {
        try {

            const { organizationId } = req.user!;

            const contactId = req.query.contactId as string;
            const eventId = req.query.eventId as string;
            const email = req.query.email as string;
            const phone = req.query.phone as string;
            const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 15;
            const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

            const result = await this.messageService.getMessages(
                organizationId, contactId, eventId, email, phone, limit, offset
            );

            res.json({
                success: true,
                data: result,
                pagination: {
                    limit,
                    offset,
                    count: result.length,
                }
            });
        } catch (error) {
            next(error);
        }
    }

    retryFailedMessages = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { organizationId } = req.user!;
             const failedMessages = await this.messageService.retryFailedMessages(organizationId);

            return res.status(200).json({ 
                success: true, 
                message: `Retried ${failedMessages.length} messages` 
            });
        } catch (error) {
            next(error);
        }
    }
}

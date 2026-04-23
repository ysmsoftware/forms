import { NextFunction, Request, Response} from "express";
import { TagService } from "../services/tag.service";
import { BadRequestError } from "../errors/http-errors";


export class TagController {
    
    constructor(private tagService: TagService) { }

    create = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { organizationId } = req.user!;
            const { name } = req.body;
            if(!name) {
                throw new BadRequestError("Tag name required")
            }

            const result = await this.tagService.createTag(organizationId, name);

            return res.status(201).json({
                success: true,
                data: result
            });

        } catch (error) {
            next(error);
        }
    }

    list = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { organizationId } = req.user!;
            const result = await this.tagService.listTags(organizationId);

            return res.json({
                success: true,
                data: result
            });

        } catch (error) {
            next(error);
        }
    }

    addToContact = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { organizationId } = req.user!;
            const { contactId, tagId } = req.body;

            if(!contactId || !tagId) {
                throw new BadRequestError("contactId and tagId required");
            }

            await this.tagService.addTagToContact(organizationId, contactId, tagId);

            return res.json({
                success: true,
                message: "Tag added to contact",
            });

        } catch (error) {
            next(error);
        }
    }

    removeFromContact = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { organizationId } = req.user!;
            const { contactId, tagId } = req.body;

            if(!contactId || !tagId) {
                throw new BadRequestError("contactId and tagId required");
            }

            await this.tagService.removeTagFromContact(organizationId, contactId, tagId);

            return res.json({
                success: true,
                message: "Tag removed from contact",
            });

        } catch (error) {
            next(error);
        }
    }

    bulkAdd = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { organizationId } = req.user!;
            const { tagId, contactIds } = req.body;

            if(!tagId || ! Array.isArray(contactIds)) {
                throw new BadRequestError("tagId and contactIds[] required");
            }

            await this.tagService.bulkAddTagToContacts(organizationId, tagId, contactIds);

            return res.json({
                success: true,
                message: "Tag assigned to contacts"
            });

        } catch (error) {
            next(error);
        }
    }

    getContactByTag = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { organizationId } = req.user!;
            const tagId = req.params.tagId as string;

            const result = await this.tagService.getContactIdsByTag(organizationId, tagId);

            return res.json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
}
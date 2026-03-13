import { Request, Response, NextFunction } from 'express';
import { FormService } from '../services/form.service';
import logger from '../config/logger';

export class FormController {
    
    constructor(private formService: FormService) {}

    // create form

    createForm = async (req: Request, res: Response, next: NextFunction) => {
        try {
            
            const userId = req.user!.id;
            const  eventId = req.params.eventId as string;

            const result = await this.formService.createForm(userId, eventId, req.body);
            
            logger.info("FORM_CREATED", { userId, eventId });
            
            res.status(201).json({ success: true, data: result });

        } catch(error) {
            next(error);
        }
    }

    // update / upsert form

    upsertForm = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.id;
            const eventId = req.params.eventId as string;
    
            const result = await this.formService.upsertForm(userId, eventId, req.body)
            
            logger.info("FORM_UPDATED", { userId, eventId });
            
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }


    // get form by event
    getFormByEvent  = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.id;
            const eventId = req.params.eventId as string;
    
            const result = await this.formService.getFormByEvent(userId, eventId );

            res.status(200).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    // get form by id
    getFormById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.id;
            const formId = req.params.formId as string;

            const result = await this.formService.getFormById(userId,formId);

            res.status(200).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    } 

    // get form by slug
    getFormBySlug = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const slug = req.params.slug as string;

            const result = await this.formService.getFormBySlug(slug);

            res.status(200).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    } 

    // publish form
    publishForm = async(req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.id;
            const formId = req.params.formId as string;
            
            const result = await this.formService.publishForm(userId,formId);
            logger.info("FORM_PUBLIISHED", { userId, formId });

            res.status(200).json({ success: true, data: result });
            
        } catch (error) {
            next(error);
        }
    }

    // delete form

    deleteForm = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.id;
            const formId = req.params.formId as string;

            await this.formService.deleteForm(userId, formId);
            logger.info("FORM_DELETED", { userId, formId });


            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

}
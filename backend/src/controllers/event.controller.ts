import { Request, Response, NextFunction } from "express";
import { EventService } from "../services/event.service";

export class EventController {

    constructor(private eventService: EventService) {}

    // createEvent

    createEvent = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.id;
            const result = await this.eventService.createEvent(req.body, userId);

            res.status(201).json({ success: true, data: result });

        } catch(error) {
            next(error);
        }
    }

    // updateEvent

    updateEvent = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user!.id;
            const result = await this.eventService.updateEvent(req.params.id as string, userId, req.body);

            res.status(200).json({ success: true, data: result});

        } catch(error) {
            next(error);
        }
    }

    // findBy id

    findById = async (req: Request, res: Response, next: NextFunction) => {   
        try {
            const result = await this.eventService.findbyId(req.params.id as string);

            res.status(200).json({ success: true, data: result });

        } catch(error) {
            next(error);
        }
    }

    // finfBy slug

    findBySlug  = async (req: Request, res: Response, next: NextFunction) => {   
        try {

            const result = await this.eventService.findbySlug(req.params.slug as string);

            res.status(200).json({ success: true, data: result });

        } catch(error) {
            next(error);
        }
    }

    // findBy user

    findByUser  = async (req: Request, res: Response, next: NextFunction) => {   
        try {
            const userId = req.user!.id;
            const result = await this.eventService.findByUser(userId);

            res.status(200).json({ success: true, data: result });

        } catch(error) {
            next(error);
        }
    }

    publishEvent =  async (req: Request, res: Response, next: NextFunction) => {   
        try {
            const userId = req.user!.id;
            const result = await this.eventService.publishEvent(req.params.id as string, userId);

            res.status(200).json({ success: true, data: result });

        } catch(error) {
            next(error);
        }
    }

     closeEvent =  async (req: Request, res: Response, next: NextFunction) => {   
        try {
            const userId = req.user!.id;
            const result = await this.eventService.closeEvent(req.params.id as string, userId);

            res.status(200).json({ success: true, data: result });

        } catch(error) {
            next(error);
        }
    }
    
    deleteEvent =  async (req: Request, res: Response, next: NextFunction) => {   
        try {
            const userId = req.user!.id;
            const result = await this.eventService.deleteEvent(req.params.id as string, userId);

            res.status(200).json({ success: true, data: result });

        } catch(error) {
            next(error);
        }
    }

}
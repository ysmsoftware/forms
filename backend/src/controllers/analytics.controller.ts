import { NextFunction, Request, Response } from "express";
import { AnalyticsService } from "../services/analytics.service";
import { BadRequestError } from "../errors/http-errors";


export class AnalyticsController { 

    constructor(private analyticsService: AnalyticsService) {}


    getGlobalStats = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { organizationId } = req.user!;
            const result = await this.analyticsService.getGlobalStats(organizationId);

            res.status(200).json({
                success: true,
                data: result
            });
            
        } catch(error) {
            next(error);
        }
    }

    getEventAnalytics = async (req: Request, res: Response, next: NextFunction) => {
        try {   
            const { organizationId } = req.user!;
            const eventId = req.params.eventId as string;

            if(!eventId) throw new BadRequestError("Event ID is needed for analytics");

            const result = await this.analyticsService.getEventAnalytics(eventId, organizationId);

            res.status(200).json({
                success: true,
                data: result,
            });

        } catch(error) {
            next(error);
        }
    }

    getDailyAnalytics = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { organizationId } = req.user!;
            const eventId = req.params.eventId as string;

            if (!eventId) throw new BadRequestError("Event ID is needed for daily analytics");

            const days = req.query.days ? Number(req.query.days) : 30;

            if (isNaN(days) || days < 1 || days > 365) {
                throw new BadRequestError("days must be a number between 1 and 365");
            }

            const result = await this.analyticsService.getEventAnalyticsRange(eventId, organizationId, days);

            res.status(200).json({
                success: true,
                data: result.timeline,
            });

        } catch (error) {
            next(error);
        }
    }
}
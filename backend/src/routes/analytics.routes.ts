import { Router } from 'express';
import { authenticatedOrgMiddleware } from '../middlewares/authenticated-org.middleware';
import { analyticsController } from '../container';

const router = Router();


router.get("/events/:eventId/daily", authenticatedOrgMiddleware, analyticsController.getDailyAnalytics);
router.get("/events/:eventId", authenticatedOrgMiddleware, analyticsController.getEventAnalytics);
router.get("/global", authenticatedOrgMiddleware, analyticsController.getGlobalStats);


export default router;
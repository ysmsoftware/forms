import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { analyticsController } from '../container';

const router = Router();


router.get("/events/:eventId/daily", authMiddleware, analyticsController.getDailyAnalytics);
router.get("/events/:eventId", authMiddleware, analyticsController.getEventAnalytics);
router.get("/global", authMiddleware, analyticsController.getGlobalStats);


export default router;
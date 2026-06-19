
import { Router } from 'express';
import { authenticatedOrgMiddleware } from '../middlewares/authenticated-org.middleware';
import { messageController } from '../container';


const router = Router();

router.get('/', authenticatedOrgMiddleware, messageController.getMessages);
router.post('/resolve-params', authenticatedOrgMiddleware, messageController.resolveParams);
router.post('/send', authenticatedOrgMiddleware, messageController.send);
router.post('/retry-failed', authenticatedOrgMiddleware, messageController.retryFailedMessages);

// Bulk send — the backend resolves all submitted contacts for the event.
// No contactIds are sent from the client.
router.post('/admin/events/:eventId/bulk-send', authenticatedOrgMiddleware, messageController.bulkSend);


export default router;
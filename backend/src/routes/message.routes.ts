
import { Router } from 'express';
import { authenticatedOrgMiddleware } from '../middlewares/authenticated-org.middleware';
import { messageController } from '../container';


const router = Router();

router.get('/', authenticatedOrgMiddleware, messageController.getMessages);
router.post('/resolve-params', authenticatedOrgMiddleware, messageController.resolveParams);
router.post('/send', authenticatedOrgMiddleware, messageController.send);   
router.post('/retry-failed', authenticatedOrgMiddleware, messageController.retryFailedMessages);


export default router;
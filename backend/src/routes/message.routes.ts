
import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { messageController } from '../container';


const router = Router();

router.get('/', authMiddleware, messageController.getMessages);
router.post('/resolve-params', authMiddleware, messageController.resolveParams);
router.post('/send', authMiddleware, messageController.send);


export default router;
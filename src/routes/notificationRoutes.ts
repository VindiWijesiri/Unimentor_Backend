import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { listNotifications, markNotificationRead } from '../controllers/notificationController';

const router = Router();

router.get('/', authenticate, listNotifications);
router.patch('/:id/read', authenticate, markNotificationRead);

export default router;

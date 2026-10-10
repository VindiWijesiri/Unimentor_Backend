import { Router } from 'express';
import {
  sendBookingConfirmation,
  checkWhatsAppStatus,
  sendTestMessage,
} from '../controllers/whatsappController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Send booking confirmation via WhatsApp
router.post('/send-booking-confirmation', authenticate, sendBookingConfirmation);

// Check WhatsApp service status
router.get('/status', authenticate, checkWhatsAppStatus);

// Send test message
router.post('/test', authenticate, sendTestMessage);

export default router;

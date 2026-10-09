import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getChatInbox,
  getConversation,
  sendMessage,
  updateMessage,
  deleteMessage,
  deleteConversation,
} from '../controllers/chatController';

const router = Router();

router.get('/', authenticate, getChatInbox);
router.get('/:participantId', authenticate, getConversation);
router.post('/:participantId', authenticate, sendMessage);
router.put('/messages/:messageId', authenticate, updateMessage);
router.delete('/messages/:messageId', authenticate, deleteMessage);
router.delete('/:participantId', authenticate, deleteConversation);

export default router;

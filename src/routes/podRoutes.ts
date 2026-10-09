import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createPodSquad,
  getPodConversation,
  getPodFeed,
  getPodMessages,
  getPodUnread,
  listPodConversations,
  listPodPeople,
  markPodRead,
  respondPodProposal,
  sendPodMessage,
  startDirectConversation,
  votePodConversation,
} from '../controllers/podController';

const router = Router();

router.get('/conversations', authenticate, listPodConversations);
router.get('/feed', authenticate, getPodFeed);
router.get('/unread', authenticate, getPodUnread);
router.get('/people', authenticate, listPodPeople);
router.post('/conversations', authenticate, createPodSquad);
router.post('/conversations/direct', authenticate, startDirectConversation);
router.get('/conversations/:id', authenticate, getPodConversation);
router.get('/conversations/:id/messages', authenticate, getPodMessages);
router.post('/conversations/:id/messages', authenticate, sendPodMessage);
router.post('/conversations/:id/read', authenticate, markPodRead);
router.post('/conversations/:id/vote', authenticate, votePodConversation);
router.post('/conversations/:id/proposal', authenticate, respondPodProposal);

export default router;

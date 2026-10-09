import { Router } from 'express';
import { searchMentors, getMentorById } from '../controllers/mentorController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/search', authenticate, searchMentors);
router.get('/:id', authenticate, getMentorById);

export default router;

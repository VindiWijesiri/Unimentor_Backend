import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  getTutorReviews,
  saveTutorReview,
  getMyReviews,
  updateReview,
  deleteReview,
} from '../controllers/reviewController';

const router = Router();

router.get('/my-reviews', authenticate, requireRole('student'), getMyReviews);
router.get('/tutors/:tutorId', authenticate, getTutorReviews);
router.post('/tutors/:tutorId', authenticate, requireRole('student'), saveTutorReview);
router.put('/:id', authenticate, requireRole('student'), updateReview);
router.delete('/:id', authenticate, requireRole('student'), deleteReview);

export default router;

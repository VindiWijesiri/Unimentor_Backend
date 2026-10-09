import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createLibraryItem,
  getLibraryItem,
  listLibrary,
  progressLibraryItem,
  saveLibraryItem,
  submitLibraryQuiz,
} from '../controllers/libraryController';

const router = Router();

router.get('/', authenticate, listLibrary);
router.post('/', authenticate, createLibraryItem);
router.get('/:id', authenticate, getLibraryItem);
router.post('/:id/save', authenticate, saveLibraryItem);
router.post('/:id/progress', authenticate, progressLibraryItem);
router.post('/:id/quiz', authenticate, submitLibraryQuiz);

export default router;

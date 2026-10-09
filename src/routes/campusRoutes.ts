import { Router } from 'express';
import { getCampus, getMyCampus, listCampuses, registerCampus } from '../controllers/campusController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', listCampuses);
router.post('/', registerCampus);
router.get('/mine', authenticate, getMyCampus);
router.get('/:id', getCampus);

export default router;

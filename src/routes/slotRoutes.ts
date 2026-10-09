import { Router } from 'express';
import {
  getSlots,
  createSlot,
  getSlotById,
  updateSlot,
  deleteSlot,
  registerForSlot,
  cancelRegistration,
} from '../controllers/slotController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Slots can be viewed publicly or authenticated
router.get('/', getSlots);
router.get('/:id', getSlotById);

// Tutor Slot management
router.post('/', authenticate, createSlot);
router.put('/:id', authenticate, updateSlot);
router.delete('/:id', authenticate, deleteSlot);

// Student registration for slot
router.post('/:id/register', authenticate, registerForSlot);
router.post('/:id/cancel-registration', authenticate, cancelRegistration);

export default router;

import { Router } from 'express';
import multer from 'multer';
import {
  verifyFace,
  getVerificationStatus,
  getVerificationHistory,
} from '../controllers/faceVerificationController';
import { authenticate } from '../middleware/auth';

// Upload

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB limit
  fileFilter: (_req: any, file: any, cb: any) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are permitted for face verification.'));
    }
  },
});

// Authenticated Face++ Verification Endpoints now

router.post('/verify', authenticate, upload.single('selfie'), verifyFace);
router.get('/status', authenticate, getVerificationStatus);
router.get('/history', authenticate, getVerificationHistory);

export default router;

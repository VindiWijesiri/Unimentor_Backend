import { Router } from 'express';
import {
  login,
  register,
  getMe,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  sendVerificationOtp,
  verifyEmailOtp,
  campusLogin,
  verifyLoginCode,
  revokeSessions,
  changePassword,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/campus-login', campusLogin);
router.post('/verify-login-code', verifyLoginCode);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-code', verifyResetCode);
router.post('/reset-password', resetPassword);
router.post('/send-verification-otp', sendVerificationOtp);
router.post('/verify-email-otp', verifyEmailOtp);
router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, changePassword);
router.post('/revoke-sessions', authenticate, revokeSessions);

export default router;

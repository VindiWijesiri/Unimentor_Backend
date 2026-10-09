import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  getStudentDashboard,
  registerModule,
  assignMentorToModule,
  dropModule,
  addStudentGoal,
  updateModuleProgress,
  removeSubjectOrInterest,
  getShortlist,
  addToShortlist,
  updateShortlist,
  removeFromShortlist,
  listDirectory,
  setAccountStatus,
  setVerificationStatus,
  saveDocument,
  getDocuments,
  reviewDocument,
  getSecuritySettings,
  updateSecuritySettings,
  getNotificationSettings,
  updateNotificationSettings,
} from '../controllers/userController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.delete('/profile/subjects/:subject', authenticate, removeSubjectOrInterest);

// Student Dashboard and Registered Modules & Mentors
router.get('/dashboard', authenticate, getStudentDashboard);
router.post('/enrolled-modules', authenticate, registerModule);
router.put('/enrolled-modules/:code/mentor', authenticate, assignMentorToModule);
router.put('/enrolled-modules/:code/progress', authenticate, updateModuleProgress);
router.delete('/enrolled-modules/:code', authenticate, dropModule);
router.post('/goals', authenticate, addStudentGoal);

// Tutor Shortlist CRUD
router.get('/shortlist', authenticate, getShortlist);
router.post('/shortlist', authenticate, addToShortlist);
router.put('/shortlist/:mentorId', authenticate, updateShortlist);
router.delete('/shortlist/:mentorId', authenticate, removeFromShortlist);
router.get('/directory', authenticate, listDirectory);
router.post('/documents', authenticate, saveDocument);
router.get('/security', authenticate, getSecuritySettings);
router.put('/security', authenticate, updateSecuritySettings);
router.get('/notification-settings', authenticate, getNotificationSettings);
router.put('/notification-settings', authenticate, updateNotificationSettings);
router.get('/:id/documents', authenticate, getDocuments);
router.patch('/:id/documents/:kind', authenticate, reviewDocument);
router.patch('/:id/account-status', authenticate, setAccountStatus);
router.patch('/:id/verification', authenticate, setVerificationStatus);

export default router;

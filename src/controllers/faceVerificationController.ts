import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import FaceVerification from '../models/FaceVerification';
import { faceVerificationService } from '../services/faceVerificationService';

// In-memory set to prevent duplicate simultaneous verification submissions
const activeVerifications = new Set<string>();

export async function verifyFace(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized — user authentication required.' });
    return;
  }

  // Prevent simultaneous duplicate requests
  if (activeVerifications.has(userId)) {
    res.status(429).json({
      success: false,
      message: 'A verification request is already in progress. Please wait.',
    });
    return;
  }

  activeVerifications.add(userId);

  try {
    let selfieBuffer: Buffer | null = null;
    let mimeType = 'image/jpeg';

    const reqAny = req as any;
    // 1. Check multipart file upload (multer)
    if (reqAny.file?.buffer) {
      selfieBuffer = reqAny.file.buffer;
      mimeType = reqAny.file.mimetype || 'image/jpeg';
    } else if (req.body?.selfie) {
      // 2. Check base64 encoded string upload
      const raw = String(req.body.selfie);
      const match = raw.match(/^data:(image\/[a-zA-Z+]+);base64,/);
      if (match) {
        mimeType = match[1];
        selfieBuffer = Buffer.from(raw.replace(/^data:image\/[a-zA-Z+]+;base64,/, ''), 'base64');
      } else {
        selfieBuffer = Buffer.from(raw, 'base64');
      }
    }

    if (!selfieBuffer || selfieBuffer.length === 0) {
      res.status(400).json({
        success: false,
        message: 'A selfie image is required for face verification.',
      });
      return;
    }

    // Size limit check (max 8MB)
    if (selfieBuffer.length > 8 * 1024 * 1024) {
      res.status(400).json({
        success: false,
        message: 'Selfie image is too large. Maximum size is 8MB.',
      });
      return;
    }

    // Find authenticated user
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
      return;
    }

    // Perform face comparison
    const result = await faceVerificationService.compareFaces(user, selfieBuffer, mimeType);

    // Save verification audit record in DB
    const verificationRecord = await FaceVerification.create({
      userId: user._id,
      status: result.status,
      confidence: result.confidence,
      threshold: result.threshold,
      thresholds: result.thresholds,
      faceId1: result.faceId1,
      faceId2: result.faceId2,
      errorMessage: !result.verified ? result.message : undefined,
      verifiedAt: result.verified ? new Date() : undefined,
    });

    // Update user profile if verified
    if (result.verified) {
      user.verificationStatus = 'verified';
      user.isVerified = true;
      user.faceVerifiedAt = new Date();
      await user.save();
    }

    console.log(
      `[faceVerificationController] Verification completed for ${user.email}: ` +
      `status=${result.status}, verified=${result.verified}, confidence=${result.confidence}%`
    );

    if (result.status === 'error') {
      res.status(400).json({
        success: false,
        verified: false,
        confidence: result.confidence,
        threshold: result.threshold,
        status: 'error',
        message: result.message,
      });
      return;
    }

    res.json({
      success: true,
      verified: result.verified,
      confidence: result.confidence,
      threshold: result.threshold,
      status: result.status,
      message: result.message,
      verificationId: verificationRecord._id,
    });
  } catch (err) {
    next(err);
  } finally {
    activeVerifications.delete(userId);
  }
}

export async function getVerificationStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const user = await User.findById(userId).select('verificationStatus isVerified faceVerifiedAt profilePicture idPhoto');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const latestAttempt = await FaceVerification.findOne({ userId }).sort({ createdAt: -1 });

    res.json({
      verificationStatus: user.verificationStatus || 'unverified',
      isVerified: !!user.isVerified,
      faceVerifiedAt: user.faceVerifiedAt,
      latestAttempt: latestAttempt
        ? {
            status: latestAttempt.status,
            confidence: latestAttempt.confidence,
            threshold: latestAttempt.threshold,
            createdAt: latestAttempt.createdAt,
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
}

export async function getVerificationHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const history = await FaceVerification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('-__v');

    res.json({ history });
  } catch (err) {
    next(err);
  }
}

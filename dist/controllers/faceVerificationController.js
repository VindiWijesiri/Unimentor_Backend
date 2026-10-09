"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyFace = verifyFace;
exports.getVerificationStatus = getVerificationStatus;
exports.getVerificationHistory = getVerificationHistory;
const User_1 = __importDefault(require("../models/User"));
const FaceVerification_1 = __importDefault(require("../models/FaceVerification"));
const faceVerificationService_1 = require("../services/faceVerificationService");
// In-memory set to prevent duplicate simultaneous verification submissions
const activeVerifications = new Set();
async function verifyFace(req, res, next) {
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
        let selfieBuffer = null;
        let mimeType = 'image/jpeg';
        const reqAny = req;
        // 1. Check multipart file upload (multer)
        if (reqAny.file?.buffer) {
            selfieBuffer = reqAny.file.buffer;
            mimeType = reqAny.file.mimetype || 'image/jpeg';
        }
        else if (req.body?.selfie) {
            // 2. Check base64 encoded string upload
            const raw = String(req.body.selfie);
            const match = raw.match(/^data:(image\/[a-zA-Z+]+);base64,/);
            if (match) {
                mimeType = match[1];
                selfieBuffer = Buffer.from(raw.replace(/^data:image\/[a-zA-Z+]+;base64,/, ''), 'base64');
            }
            else {
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
        const user = await User_1.default.findById(userId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User account not found.',
            });
            return;
        }
        // Perform face comparison
        const result = await faceVerificationService_1.faceVerificationService.compareFaces(user, selfieBuffer, mimeType);
        // Save verification audit record in DB
        const verificationRecord = await FaceVerification_1.default.create({
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
        console.log(`[faceVerificationController] Verification completed for ${user.email}: ` +
            `status=${result.status}, verified=${result.verified}, confidence=${result.confidence}%`);
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
    }
    catch (err) {
        next(err);
    }
    finally {
        activeVerifications.delete(userId);
    }
}
async function getVerificationStatus(req, res, next) {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const user = await User_1.default.findById(userId).select('verificationStatus isVerified faceVerifiedAt profilePicture idPhoto');
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const latestAttempt = await FaceVerification_1.default.findOne({ userId }).sort({ createdAt: -1 });
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
    }
    catch (err) {
        next(err);
    }
}
async function getVerificationHistory(req, res, next) {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const history = await FaceVerification_1.default.find({ userId })
            .sort({ createdAt: -1 })
            .limit(10)
            .select('-__v');
        res.json({ history });
    }
    catch (err) {
        next(err);
    }
}

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const faceVerificationController_1 = require("../controllers/faceVerificationController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024 }, // 8MB limit
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files are permitted for face verification.'));
        }
    },
});
// Authenticated Face++ Verification Endpoints
router.post('/verify', auth_1.authenticate, upload.single('selfie'), faceVerificationController_1.verifyFace);
router.get('/status', auth_1.authenticate, faceVerificationController_1.getVerificationStatus);
router.get('/history', auth_1.authenticate, faceVerificationController_1.getVerificationHistory);
exports.default = router;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMySessions = getMySessions;
exports.bookSession = bookSession;
exports.cancelSession = cancelSession;
exports.updateSession = updateSession;
exports.deleteSession = deleteSession;
exports.updateSessionStatus = updateSessionStatus;
exports.generateAgoraToken = generateAgoraToken;
const mongoose_1 = __importDefault(require("mongoose"));
const agora_token_1 = require("agora-token");
const Session_1 = __importDefault(require("../models/Session"));
const User_1 = __importDefault(require("../models/User"));
// Agora credentials (should be in .env in production)
const AGORA_APP_ID = process.env.AGORA_APP_ID || 'YOUR_AGORA_APP_ID';
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || 'YOUR_AGORA_APP_CERTIFICATE';
async function getMySessions(req, res, next) {
    try {
        let sessions = await Session_1.default.find({
            $or: [{ studentId: req.userId }, { mentorId: req.userId }],
        })
            .populate('mentorId', 'name email profilePicture experience')
            .populate('studentId', 'name email')
            .sort({ scheduledAt: 1 });
        // Seed default mentoring sessions for the user if none exist yet
        if (sessions.length === 0 && req.userId) {
            const mentors = await User_1.default.find({ role: 'mentor' }).limit(4);
            if (mentors.length > 0) {
                const seedSessions = [
                    {
                        studentId: req.userId,
                        mentorId: mentors[0]._id,
                        subject: 'Data Structures: Tree & Graph Traversals',
                        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // Tomorrow 10:00 AM
                        status: 'confirmed',
                        notes: 'Exam revision and solving past paper recursion & traversal problems with peer mentor.',
                    },
                    {
                        studentId: req.userId,
                        mentorId: mentors[1]?._id || mentors[0]._id,
                        subject: 'Software Architecture: Microservices & Design Patterns',
                        scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // In 2 days
                        status: 'pending',
                        notes: 'Guidance on Factory, Singleton, and Dependency Injection pattern implementation.',
                    },
                    {
                        studentId: req.userId,
                        mentorId: mentors[2]?._id || mentors[0]._id,
                        subject: 'Mobile App Development: State Management & Navigation',
                        scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000), // In 3 days
                        status: 'confirmed',
                        notes: 'Hands-on debugging session for React Native state persistence and routing.',
                    },
                    {
                        studentId: req.userId,
                        mentorId: mentors[0]._id,
                        subject: 'DBMS: Complex SQL Queries & Indexing',
                        scheduledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
                        status: 'completed',
                        notes: 'Covered query optimization, B-Tree indexes, and normalized database schema design.',
                    },
                ];
                await Session_1.default.insertMany(seedSessions);
                sessions = await Session_1.default.find({
                    $or: [{ studentId: req.userId }, { mentorId: req.userId }],
                })
                    .populate('mentorId', 'name email profilePicture experience')
                    .populate('studentId', 'name email')
                    .sort({ scheduledAt: 1 });
            }
        }
        res.json(sessions);
    }
    catch (err) {
        next(err);
    }
}
async function bookSession(req, res, next) {
    try {
        let { mentorId, subject, scheduledAt, notes } = req.body;
        // Resolve mentorId to a valid ObjectId if dummy/fallback string was passed
        if (!mentorId || !mongoose_1.default.isValidObjectId(mentorId)) {
            const dbMentor = await User_1.default.findOne({ role: 'mentor' });
            mentorId = dbMentor ? dbMentor._id : undefined;
        }
        if (!mentorId) {
            res.status(400).json({ message: 'No mentor available for booking.' });
            return;
        }
        const session = await Session_1.default.create({
            mentorId,
            studentId: req.userId,
            subject: subject || 'Peer Mentoring Session',
            scheduledAt: scheduledAt || new Date(),
            notes,
        });
        const populated = await Session_1.default.findById(session._id)
            .populate('mentorId', 'name email profilePicture experience')
            .populate('studentId', 'name email');
        res.status(201).json(populated || session);
    }
    catch (err) {
        next(err);
    }
}
async function cancelSession(req, res, next) {
    try {
        if (!mongoose_1.default.isValidObjectId(req.params.id)) {
            res.status(400).json({ message: 'Invalid session ID format.' });
            return;
        }
        const session = await Session_1.default.findById(req.params.id);
        if (!session) {
            res.status(404).json({ message: 'Session not found.' });
            return;
        }
        const isOwner = !session.studentId ||
            !session.mentorId ||
            String(session.studentId) === req.userId ||
            String(session.mentorId) === req.userId ||
            req.userRole === 'student' ||
            req.userRole === 'admin';
        if (!isOwner) {
            res.status(403).json({ message: 'Not authorised to cancel this session.' });
            return;
        }
        session.status = 'cancelled';
        await session.save();
        const populated = await Session_1.default.findById(session._id)
            .populate('mentorId', 'name email profilePicture experience')
            .populate('studentId', 'name email');
        res.json(populated || session);
    }
    catch (err) {
        next(err);
    }
}
async function updateSession(req, res, next) {
    try {
        if (!mongoose_1.default.isValidObjectId(req.params.id)) {
            res.status(400).json({ message: 'Invalid session ID format.' });
            return;
        }
        const session = await Session_1.default.findById(req.params.id);
        if (!session) {
            res.status(404).json({ message: 'Session not found.' });
            return;
        }
        const isOwner = !session.studentId ||
            !session.mentorId ||
            String(session.studentId) === req.userId ||
            String(session.mentorId) === req.userId ||
            req.userRole === 'student' ||
            req.userRole === 'admin';
        if (!isOwner) {
            res.status(403).json({ message: 'Not authorised to update this session.' });
            return;
        }
        const { subject, scheduledAt, notes, status, mentorId } = req.body;
        if (subject)
            session.subject = subject.trim();
        if (scheduledAt)
            session.scheduledAt = new Date(scheduledAt);
        if (notes !== undefined)
            session.notes = notes.trim();
        if (status)
            session.status = status;
        if (mentorId && mongoose_1.default.isValidObjectId(mentorId)) {
            session.mentorId = mentorId;
        }
        await session.save();
        const populated = await Session_1.default.findById(session._id)
            .populate('mentorId', 'name email profilePicture experience')
            .populate('studentId', 'name email');
        res.json(populated || session);
    }
    catch (err) {
        next(err);
    }
}
async function deleteSession(req, res, next) {
    try {
        if (!mongoose_1.default.isValidObjectId(req.params.id)) {
            res.status(400).json({ message: 'Invalid session ID format.' });
            return;
        }
        const session = await Session_1.default.findById(req.params.id);
        if (!session) {
            res.status(404).json({ message: 'Session not found.' });
            return;
        }
        const isOwner = !session.studentId ||
            !session.mentorId ||
            String(session.studentId) === req.userId ||
            String(session.mentorId) === req.userId ||
            req.userRole === 'student' ||
            req.userRole === 'admin';
        if (!isOwner) {
            res.status(403).json({ message: 'Not authorised to delete this session.' });
            return;
        }
        await Session_1.default.findByIdAndDelete(req.params.id);
        res.json({ message: 'Session deleted successfully.', id: req.params.id });
    }
    catch (err) {
        next(err);
    }
}
async function updateSessionStatus(req, res, next) {
    try {
        if (!mongoose_1.default.isValidObjectId(req.params.id)) {
            res.status(400).json({ message: 'Invalid session ID format.' });
            return;
        }
        const { status } = req.body;
        const session = await Session_1.default.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true })
            .populate('mentorId', 'name email profilePicture experience')
            .populate('studentId', 'name email');
        if (!session) {
            res.status(404).json({ message: 'Session not found.' });
            return;
        }
        res.json(session);
    }
    catch (err) {
        next(err);
    }
}
/**
 * Generate Agora RTC token for video calling
 * POST /api/sessions/:id/token
 */
async function generateAgoraToken(req, res, next) {
    try {
        const { channelName } = req.body;
        const sessionId = req.params.id;
        if (!channelName) {
            res.status(400).json({ message: 'channelName is required' });
            return;
        }
        // Verify session exists (optional validation)
        if (mongoose_1.default.isValidObjectId(sessionId)) {
            const session = await Session_1.default.findById(sessionId);
            if (!session) {
                res.status(404).json({ message: 'Session not found' });
                return;
            }
        }
        // Generate unique user ID for this connection
        const uid = Math.floor(Math.random() * 1000000);
        // Token expires in 24 hours (86400 seconds)
        const expirationTimeInSeconds = 86400;
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
        // Build token with RtcRole.PUBLISHER (allows both sending and receiving)
        const token = agora_token_1.RtcTokenBuilder.buildTokenWithUid(AGORA_APP_ID, AGORA_APP_CERTIFICATE, channelName, uid, agora_token_1.RtcRole.PUBLISHER, privilegeExpiredTs, privilegeExpiredTs // Add privilegeExpire parameter
        );
        res.json({
            token,
            appId: AGORA_APP_ID,
            channelName,
            uid,
            expiresAt: new Date(privilegeExpiredTs * 1000).toISOString(),
        });
    }
    catch (err) {
        next(err);
    }
}

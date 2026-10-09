"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const mentorRoutes_1 = __importDefault(require("./routes/mentorRoutes"));
const sessionRoutes_1 = __importDefault(require("./routes/sessionRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const reviewRoutes_1 = __importDefault(require("./routes/reviewRoutes"));
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const slotRoutes_1 = __importDefault(require("./routes/slotRoutes"));
const learningRoutes_1 = __importDefault(require("./routes/learningRoutes"));
const podRoutes_1 = __importDefault(require("./routes/podRoutes"));
const libraryRoutes_1 = __importDefault(require("./routes/libraryRoutes"));
const campusRoutes_1 = __importDefault(require("./routes/campusRoutes"));
const faceVerificationRoutes_1 = __importDefault(require("./routes/faceVerificationRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const errorHandler_1 = require("./middleware/errorHandler");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '15mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '15mb' }));
// Detailed Request & Response logger for debugging mobile client calls
app.use((req, res, next) => {
    const start = Date.now();
    const hasAuth = !!req.headers.authorization;
    console.log(`\n📡 [BACKEND INCOMING] ${req.method} ${req.originalUrl}`);
    console.log(`   Origin IP: ${req.ip} | Authorization: ${hasAuth ? 'Bearer [token present]' : 'NONE'}`);
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        const safeBody = { ...req.body };
        if (safeBody.password)
            safeBody.password = '****';
        console.log(`   Body:`, JSON.stringify(safeBody));
    }
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`📤 [BACKEND OUTGOING] ${req.method} ${req.originalUrl} -> Status: ${res.statusCode} (${duration}ms)`);
    });
    next();
});
const mongoose_1 = __importDefault(require("mongoose"));
// Health check
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        dbConnected: mongoose_1.default.connection.readyState === 1,
        timestamp: new Date().toISOString(),
    });
});
// Database connectivity check for API routes to prevent Mongoose 10s query hangs
app.use('/api', (req, res, next) => {
    if (req.path.startsWith('/payment') || req.path.startsWith('/slots')) {
        return next(); // DirectPay, payment, and slots operations are always available
    }
    if (mongoose_1.default.connection.readyState !== 1) {
        return res.status(503).json({
            message: 'Database connection pending. Please whitelist IP 112.134.149.17 or 0.0.0.0/0 in MongoDB Atlas > Network Access.',
        });
    }
    next();
});
// API routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/mentors', mentorRoutes_1.default);
app.use('/api/sessions', sessionRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/reviews', reviewRoutes_1.default);
app.use('/api/chats', chatRoutes_1.default);
app.use('/api/payment', paymentRoutes_1.default);
app.use('/api/slots', slotRoutes_1.default);
app.use('/api/learning', learningRoutes_1.default);
app.use('/api/library', libraryRoutes_1.default);
app.use('/api/pod', podRoutes_1.default);
app.use('/api/campuses', campusRoutes_1.default);
app.use('/api/face-verification', faceVerificationRoutes_1.default);
app.use('/api/notifications', notificationRoutes_1.default);
app.use('/api/payments', paymentRoutes_1.default);
// Global error handler — must be last
app.use(errorHandler_1.errorHandler);
exports.default = app;

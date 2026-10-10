import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import mentorRoutes from './routes/mentorRoutes';
import sessionRoutes from './routes/sessionRoutes';
import userRoutes from './routes/userRoutes';
import reviewRoutes from './routes/reviewRoutes';
import chatRoutes from './routes/chatRoutes';
import paymentRoutes from './routes/paymentRoutes';
import slotRoutes from './routes/slotRoutes';
import learningRoutes from './routes/learningRoutes';
import podRoutes from './routes/podRoutes';
import libraryRoutes from './routes/libraryRoutes';
import campusRoutes from './routes/campusRoutes';
import faceVerificationRoutes from './routes/faceVerificationRoutes';
import notificationRoutes from './routes/notificationRoutes';
import whatsappRoutes from './routes/whatsappRoutes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Detailed Request & Response logger for debugging mobile client calls
app.use((req, res, next) => {
  const start = Date.now();
  const hasAuth = !!req.headers.authorization;
  console.log(`\n📡 [BACKEND INCOMING] ${req.method} ${req.originalUrl}`);
  console.log(`   Origin IP: ${req.ip} | Authorization: ${hasAuth ? 'Bearer [token present]' : 'NONE'}`);
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const safeBody = { ...req.body };
    if (safeBody.password) safeBody.password = '****';
    console.log(`   Body:`, JSON.stringify(safeBody));
  }

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`📤 [BACKEND OUTGOING] ${req.method} ${req.originalUrl} -> Status: ${res.statusCode} (${duration}ms)`);
  });

  next();
});

import mongoose from 'mongoose';

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    dbConnected: mongoose.connection.readyState === 1,
    timestamp: new Date().toISOString(),
  });
});

// Database connectivity check for API routes to prevent Mongoose 10s query hangs
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/payment') || req.path.startsWith('/slots')) {
    return next(); // DirectPay, payment, and slots operations are always available
  }
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: 'Database connection pending. Please whitelist IP 112.134.149.17 or 0.0.0.0/0 in MongoDB Atlas > Network Access.',
    });
  }
  next();
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/mentors', mentorRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/pod', podRoutes);
app.use('/api/campuses', campusRoutes);
app.use('/api/face-verification', faceVerificationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/payments', paymentRoutes);

// Global error handler — must be last
app.use(errorHandler);

export default app;

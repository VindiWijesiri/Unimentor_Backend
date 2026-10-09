import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Session from '../models/Session';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';

export async function getMySessions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    let sessions = await Session.find({
      $or: [{ studentId: req.userId }, { mentorId: req.userId }],
    })
      .populate('mentorId', 'name email profilePicture experience')
      .populate('studentId', 'name email')
      .sort({ scheduledAt: 1 });

    // Seed default mentoring sessions for the user if none exist yet
    if (sessions.length === 0 && req.userId) {
      const mentors = await User.find({ role: 'mentor' }).limit(4);
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

        await Session.insertMany(seedSessions);

        sessions = await Session.find({
          $or: [{ studentId: req.userId }, { mentorId: req.userId }],
        })
          .populate('mentorId', 'name email profilePicture experience')
          .populate('studentId', 'name email')
          .sort({ scheduledAt: 1 });
      }
    }

    res.json(sessions);
  } catch (err) {
    next(err);
  }
}

export async function bookSession(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    let { mentorId, subject, scheduledAt, notes } = req.body;

    // Resolve mentorId to a valid ObjectId if dummy/fallback string was passed
    if (!mentorId || !mongoose.isValidObjectId(mentorId)) {
      const dbMentor = await User.findOne({ role: 'mentor' });
      mentorId = dbMentor ? dbMentor._id : undefined;
    }

    if (!mentorId) {
      res.status(400).json({ message: 'No mentor available for booking.' });
      return;
    }

    const session = await Session.create({
      mentorId,
      studentId: req.userId,
      subject: subject || 'Peer Mentoring Session',
      scheduledAt: scheduledAt || new Date(),
      notes,
    });

    const populated = await Session.findById(session._id)
      .populate('mentorId', 'name email profilePicture experience')
      .populate('studentId', 'name email');

    res.status(201).json(populated || session);
  } catch (err) {
    next(err);
  }
}

export async function cancelSession(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({ message: 'Invalid session ID format.' });
      return;
    }

    const session = await Session.findById(req.params.id);
    if (!session) {
      res.status(404).json({ message: 'Session not found.' });
      return;
    }

    const isOwner =
      !session.studentId ||
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

    const populated = await Session.findById(session._id)
      .populate('mentorId', 'name email profilePicture experience')
      .populate('studentId', 'name email');

    res.json(populated || session);
  } catch (err) {
    next(err);
  }
}

export async function updateSession(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({ message: 'Invalid session ID format.' });
      return;
    }

    const session = await Session.findById(req.params.id);
    if (!session) {
      res.status(404).json({ message: 'Session not found.' });
      return;
    }

    const isOwner =
      !session.studentId ||
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
    if (subject) session.subject = subject.trim();
    if (scheduledAt) session.scheduledAt = new Date(scheduledAt);
    if (notes !== undefined) session.notes = notes.trim();
    if (status) session.status = status;
    if (mentorId && mongoose.isValidObjectId(mentorId)) {
      session.mentorId = mentorId;
    }

    await session.save();

    const populated = await Session.findById(session._id)
      .populate('mentorId', 'name email profilePicture experience')
      .populate('studentId', 'name email');

    res.json(populated || session);
  } catch (err) {
    next(err);
  }
}

export async function deleteSession(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({ message: 'Invalid session ID format.' });
      return;
    }

    const session = await Session.findById(req.params.id);
    if (!session) {
      res.status(404).json({ message: 'Session not found.' });
      return;
    }

    const isOwner =
      !session.studentId ||
      !session.mentorId ||
      String(session.studentId) === req.userId ||
      String(session.mentorId) === req.userId ||
      req.userRole === 'student' ||
      req.userRole === 'admin';

    if (!isOwner) {
      res.status(403).json({ message: 'Not authorised to delete this session.' });
      return;
    }

    await Session.findByIdAndDelete(req.params.id);
    res.json({ message: 'Session deleted successfully.', id: req.params.id });
  } catch (err) {
    next(err);
  }
}

export async function updateSessionStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({ message: 'Invalid session ID format.' });
      return;
    }

    const { status } = req.body;
    const session = await Session.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    )
      .populate('mentorId', 'name email profilePicture experience')
      .populate('studentId', 'name email');

    if (!session) {
      res.status(404).json({ message: 'Session not found.' });
      return;
    }
    res.json(session);
  } catch (err) {
    next(err);
  }
}

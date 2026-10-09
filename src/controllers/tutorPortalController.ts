import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Session from '../models/Session';
import { GoalPlan } from '../models/goalPlan';
import { weekSummary } from '../services/studyPresence';

async function linkedStudentIds(mentorId: string) {
  const [sessions, students] = await Promise.all([
    Session.find({ mentorId }).select('studentId'),
    User.find({ 'enrolledModules.mentor.id': mentorId }).select('_id'),
  ]);
  const ids = new Set<string>();
  sessions.forEach((session) => ids.add(String(session.studentId)));
  students.forEach((student) => ids.add(String(student._id)));
  return [...ids];
}

export async function getTutorPeople(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const mentorId = String(req.userId);
    const ids = await linkedStudentIds(mentorId);
    const students = await User.find({ _id: { $in: ids } }).select('name email enrolledModules');
    const sessions = await Session.find({ mentorId, studentId: { $in: ids } }).sort({ scheduledAt: -1 });
    const rows = await Promise.all(students.map(async (student) => {
      const week = await weekSummary(String(student._id));
      const goals = await GoalPlan.countDocuments({ studentId: student._id });
      const nextSession = sessions.find((session) => (
        String(session.studentId) === String(student._id)
        && (session.status === 'pending' || session.status === 'confirmed')
        && new Date(session.scheduledAt).getTime() >= Date.now() - 60 * 60 * 1000
      ));
      return {
        _id: student._id,
        name: student.name,
        email: student.email,
        modules: (student.enrolledModules ?? [])
          .filter((module) => !module.mentor?.id || module.mentor.id === mentorId)
          .map((module) => module.code),
        hoursDone: week.hoursDone,
        hoursGoal: week.hoursGoal,
        goalCount: goals,
        nextSession: nextSession ? {
          _id: nextSession._id,
          subject: nextSession.subject,
          scheduledAt: nextSession.scheduledAt,
          status: nextSession.status,
        } : null,
      };
    }));
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

export async function getTutorStudentProgress(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const mentorId = String(req.userId);
    const studentId = req.params.id;
    const ids = await linkedStudentIds(mentorId);
    if (!ids.includes(studentId)) {
      res.status(403).json({ message: 'This student is not booked with you.' });
      return;
    }
    const [student, goals, week, sessions] = await Promise.all([
      User.findById(studentId).select('name email enrolledModules'),
      GoalPlan.find({ studentId }).sort({ createdAt: 1 }),
      weekSummary(studentId),
      Session.find({ mentorId, studentId }).sort({ scheduledAt: -1 }).limit(8),
    ]);
    if (!student) {
      res.status(404).json({ message: 'Student not found.' });
      return;
    }
    res.json({
      student: { _id: student._id, name: student.name, email: student.email },
      week,
      goals: goals.map((goal) => ({
        _id: goal._id,
        title: goal.title,
        moduleCode: goal.moduleCode,
        progress: goal.progress,
        targetGrade: goal.targetGrade,
        dueLabel: goal.dueLabel,
        completed: goal.completed,
      })),
      sessions: sessions.map((session) => ({
        _id: session._id,
        subject: session.subject,
        scheduledAt: session.scheduledAt,
        status: session.status,
        isLive: session.isLive,
      })),
    });
  } catch (err) {
    next(err);
  }
}

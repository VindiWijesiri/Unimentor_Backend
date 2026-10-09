import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import { TutorPack, TutorStudent, TutorWorkspace } from '../models/tutorLearning';
import { seedTutorLearningData } from '../services/seedTutorLearningData';
import { seedPodData } from '../services/seedPodData';
import { seedLibraryData } from '../services/seedLibraryData';

function timeAgo(date?: Date): string {
  if (!date) return '';
  const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function mapStudent(item: InstanceType<typeof TutorStudent>) {
  return {
    _id: item._id,
    studentUserId: item.studentUserId,
    name: item.name,
    initials: item.initials,
    studentCode: item.studentCode,
    year: item.year,
    programme: item.programme,
    moduleCode: item.moduleCode,
    status: item.status,
    priority: item.priority,
    workTitle: item.workTitle,
    taskLabel: item.taskLabel,
    questionCount: item.questionCount,
    pdfReady: item.pdfReady,
    score: item.score,
    maxScore: item.maxScore,
    packsDownloaded: item.packsDownloaded,
    classRank: item.classRank,
    midtermPercent: item.midtermPercent,
    feedbackSent: item.feedbackSent,
    submittedAgo: timeAgo(item.submittedAt),
    gradedAgo: timeAgo(item.gradedAt),
  };
}

async function readyTutor(req: AuthRequest): Promise<string> {
  const tutorId = String(req.userId);
  if (req.userRole === 'mentor') {
    await Promise.all([seedTutorLearningData(tutorId), seedPodData(tutorId)]);
    await seedLibraryData(tutorId);
  }
  return tutorId;
}

export async function getTutorDashboard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const tutorId = await readyTutor(req);
    const [workspace, students, packs] = await Promise.all([
      TutorWorkspace.findOne({ tutorId }),
      TutorStudent.find({ tutorId }).sort({ priority: 1, name: 1 }),
      TutorPack.find({ tutorId }).sort({ kind: 1 }),
    ]);

    const review = students.filter((item) => item.status === 'review');
    const atRisk = students.filter((item) => item.status === 'atRisk');

    res.json({
      header: {
        title: 'Learning Management',
        enrolled: students.length,
        cohort: workspace?.cohort ?? 'DSA & OOP',
      },
      stats: {
        activeStudents: students.length,
        newStudents: 3,
        pendingGrading: review.length,
        assignedPacks: workspace?.assignedPacks ?? packs.reduce((sum, pack) => sum + pack.assignedCount, 0),
        classMastery: workspace?.classMastery ?? 0,
        masteryDelta: workspace?.masteryDelta ?? 0,
      },
      filters: {
        all: students.length,
        needsReview: review.length,
        atRisk: atRisk.length,
      },
      queue: students.map(mapStudent),
      packs: packs.map((pack) => ({
        _id: pack._id,
        title: pack.title,
        kind: pack.kind,
        assignedCount: pack.assignedCount,
      })),
      tools: {
        plagiarismFlags: workspace?.plagiarismFlags ?? 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getTutorStudent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const tutorId = await readyTutor(req);
    const student = await TutorStudent.findOne({ _id: req.params.id, tutorId });
    if (!student) {
      res.status(404).json({ message: 'Student not found.' });
      return;
    }
    res.json(mapStudent(student));
  } catch (err) {
    next(err);
  }
}

export async function gradeTutorStudent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const tutorId = await readyTutor(req);
    const score = Number(req.body.score);
    if (Number.isNaN(score) || score < 0 || score > 100) {
      res.status(400).json({ message: 'Score must be between 0 and 100.' });
      return;
    }
    const student = await TutorStudent.findOneAndUpdate(
      { _id: req.params.id, tutorId },
      { score, status: 'graded', feedbackSent: true, gradedAt: new Date() },
      { new: true },
    );
    if (!student) {
      res.status(404).json({ message: 'Student not found.' });
      return;
    }
    res.json(mapStudent(student));
  } catch (err) {
    next(err);
  }
}

export async function assignTutorPack(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const tutorId = await readyTutor(req);
    const kind = req.body.kind === 'recovery' ? 'recovery' : req.body.kind === 'mock' ? 'mock' : 'study';
    const student = await TutorStudent.findOneAndUpdate(
      { _id: req.params.id, tutorId },
      { $inc: { packsDownloaded: 1 } },
      { new: true },
    );
    if (!student) {
      res.status(404).json({ message: 'Student not found.' });
      return;
    }
    await TutorPack.findOneAndUpdate({ tutorId, kind }, { $inc: { assignedCount: 1 } });
    await TutorWorkspace.findOneAndUpdate({ tutorId }, { $inc: { assignedPacks: 1 } });
    if (kind === 'recovery' && student.status === 'atRisk') {
      student.status = 'review';
      await student.save();
    }
    res.json(mapStudent(student));
  } catch (err) {
    next(err);
  }
}

export async function dispatchTutorPack(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const tutorId = await readyTutor(req);
    const kind = req.body.kind === 'mock' ? 'mock' : 'study';
    const pack = await TutorPack.findOneAndUpdate({ tutorId, kind }, { $inc: { assignedCount: 1 } }, { new: true });
    await TutorWorkspace.findOneAndUpdate({ tutorId }, { $inc: { assignedPacks: 1 } });
    res.json(pack);
  } catch (err) {
    next(err);
  }
}

export async function getTutorChatTarget(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const tutorId = await readyTutor(req);
    const student = await TutorStudent.findOne({ _id: req.params.id, tutorId });
    if (!student?.studentUserId) {
      res.status(404).json({ message: 'This student is not linked to a chat account yet.' });
      return;
    }
    const user = await User.findById(student.studentUserId);
    if (!user) {
      res.status(404).json({ message: 'Student account not found.' });
      return;
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
}

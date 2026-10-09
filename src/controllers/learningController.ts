import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import Session from '../models/Session';
import User from '../models/User';
import {
  Assessment,
  ChatPodMessage,
  Discussion,
  LearningActivity,
  StudyGoal,
  StudyMaterial,
  StudyPlan,
} from '../models/learning';
import { PodConversation } from '../models/pod';
import { LibraryMaterial } from '../models/library';
import { seedLearningData } from '../services/seedLearningData';
import { goalSummaries } from './goalPlanController';
import { addOpenSeconds, logFocusSession, setWeeklyHoursGoal, weekSummary } from '../services/studyPresence';
import { seedPodData } from '../services/seedPodData';
import { seedLibraryData } from '../services/seedLibraryData';

function timeAgo(date: Date): string {
  const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function unreadCount(conversation: { unreadCounts?: Map<string, number> | Record<string, number> }, userId: string) {
  const counts = conversation.unreadCounts;
  if (counts instanceof Map) return counts.get(userId) ?? 0;
  return (counts as Record<string, number> | undefined)?.[userId] ?? 0;
}

function clock(date?: Date) {
  if (!date) return '';
  return new Date(date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

async function readyStudent(req: AuthRequest): Promise<string> {
  const studentId = String(req.userId);
  if (req.userRole === 'student') {
    await Promise.all([seedLearningData(studentId), seedPodData(studentId)]);
    await seedLibraryData(studentId);
  }
  return studentId;
}

export async function getDashboard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = await readyStudent(req);
    const user = await User.findById(studentId);

    const [week, goals, activity, sessions, discussions, assessments, materials, podConversations] = await Promise.all([
      weekSummary(studentId),
      StudyGoal.find({ studentId }).sort({ createdAt: 1 }).limit(8).lean(),
      LearningActivity.findOne({ studentId }).sort({ updatedAt: -1 }).lean(),
      Session.find({ studentId }).populate('mentorId', 'name').sort({ scheduledAt: 1 }).limit(6).lean(),
      Discussion.find({ studentId }).sort({ createdAt: -1 }).limit(6).lean(),
      Assessment.find({ studentId }).sort({ scheduledAt: 1, dueDate: 1 }).limit(6).lean(),
      LibraryMaterial.find({
        seedKey: { $exists: false },
        $or: [{ owner: studentId }, { savedBy: studentId }],
      })
        .select('title kind moduleName moduleCode source createdAt')
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
      PodConversation.find({ participants: studentId })
        .select('type category title lastMessageText lastSenderName lastMessageAt unreadCounts participants meta seedKey')
        .sort({ lastMessageAt: -1 })
        .lean(),
    ]);
    const unreadChat = podConversations.reduce((sum, item) => sum + unreadCount(item, studentId), 0);
    const featured = podConversations.filter((item) => item.seedKey === 'pod-dsa-squad' || item.category === 'kuppiya').slice(0, 2);
    const podItems = (featured.length ? featured : podConversations.slice(0, 2)).map((item) => ({
      _id: item._id,
      type: item.type,
      category: item.category,
      title: item.title,
      lastMessageText: item.lastMessageText,
      lastSenderName: item.lastSenderName,
      lastMessageAt: item.lastMessageAt,
      timeLabel: item.type === 'group' ? clock(item.lastMessageAt) : timeAgo(item.lastMessageAt),
      unreadCount: unreadCount(item, studentId),
      participantCount: item.participants?.length ?? 0,
      meta: item.meta ?? {},
    }));

    const days = week.days.map((day) => ({ day: day.day, hours: day.hours }));
    const done = week.hoursDone;
    const goal = week.hoursGoal;
    const plannedGoals = await goalSummaries(studentId);
    const live = sessions.find((session) => session.isLive);
    const upcoming = sessions.filter((session) => !session.isLive).slice(0, 2);
    const mentorName = (live?.mentorId as { name?: string } | undefined)?.name;

    res.json({
      header: {
        unreadChat,
        initials: (user?.name ?? 'S').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
      },
      weeklyStudy: {
        hoursDone: done,
        hoursGoal: goal,
        percent: goal ? Math.round((done / goal) * 1000) / 10 : 0,
        hoursLeft: Math.max(0, Math.round((goal - done) * 10) / 10),
        days,
      },
      todayGoals: plannedGoals.length ? plannedGoals : goals.map((item) => ({
        _id: item._id,
        title: item.title,
        dueLabel: item.dueLabel,
        current: item.current,
        total: item.total,
        completed: item.completed,
      })),
      continueActivity: activity && {
        _id: activity._id,
        moduleCode: activity.moduleCode,
        moduleName: activity.moduleName,
        topic: activity.topic,
        activityType: activity.activityType,
        done: activity.done,
        total: activity.total,
        minutesLeft: activity.minutesLeft,
        percent: Math.round((activity.done / activity.total) * 100),
      },
      sessions: {
        total: sessions.length,
        live: live && {
          _id: live._id,
          type: 'Tutoring',
          title: live.subject,
          tutorName: mentorName ?? 'Tutor',
          minutesLeft: live.durationMin ?? 0,
          moduleCode: live.moduleCode,
        },
        upcoming: upcoming.map((session) => ({
          _id: session._id,
          title: session.subject,
          moduleCode: session.moduleCode,
          scheduledAt: session.scheduledAt,
        })),
      },
      discussions: {
        total: discussions.length,
        items: discussions.map((item) => ({
          _id: item._id,
          title: item.title,
          group: item.group,
          authorName: item.authorName,
          authorInitials: item.authorInitials,
          preview: item.preview,
          votes: item.votes,
          joined: item.joined,
          timeAgo: timeAgo(item.createdAt),
        })),
      },
      assessments: {
        dueSoon: assessments.filter((item) => item.status !== 'submitted').length,
        items: assessments.map((item) => ({
          _id: item._id,
          type: item.type,
          title: item.title,
          subject: item.subject,
          scheduledAt: item.scheduledAt,
          dueDate: item.dueDate,
          durationMin: item.durationMin,
          marks: item.marks,
          status: item.status,
        })),
      },
      materials: materials.map((item) => ({
        _id: String(item._id),
        title: item.title,
        kind: item.kind === 'pdf' || item.kind === 'code' ? item.kind === 'code' ? 'set' : 'pdf' : 'notes',
        sourceLabel: item.moduleName || item.moduleCode || 'Library',
        sourceType: item.source === 'group' ? 'group' : 'session',
        uploadedAt: item.createdAt,
      })),
      podFeed: {
        total: podConversations.length,
        unread: unreadChat,
        items: podItems,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getPlans(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = await readyStudent(req);
    const plans = await StudyPlan.find({ studentId }).sort({ dueDate: 1 });
    res.json(plans);
  } catch (err) {
    next(err);
  }
}

export async function getMaterials(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = await readyStudent(req);
    const materials = await StudyMaterial.find({ studentId }).sort({ uploadedAt: -1 });
    res.json(materials);
  } catch (err) {
    next(err);
  }
}

export async function getMaterial(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = await readyStudent(req);
    const material = await StudyMaterial.findOne({ _id: req.params.id, studentId });
    if (!material) {
      res.status(404).json({ message: 'Study material not found.' });
      return;
    }
    res.json(material);
  } catch (err) {
    next(err);
  }
}

export async function getAssessments(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = await readyStudent(req);
    const assessments = await Assessment.find({ studentId }).sort({ scheduledAt: 1, dueDate: 1 });
    res.json(assessments);
  } catch (err) {
    next(err);
  }
}

export async function getAssessment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = await readyStudent(req);
    const assessment = await Assessment.findOne({ _id: req.params.id, studentId });
    if (!assessment) {
      res.status(404).json({ message: 'Assessment not found.' });
      return;
    }
    res.json(assessment);
  } catch (err) {
    next(err);
  }
}

export async function submitAssessment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = await readyStudent(req);
    const assessment = await Assessment.findOneAndUpdate(
      { _id: req.params.id, studentId },
      { status: 'submitted' },
      { new: true },
    );
    if (!assessment) {
      res.status(404).json({ message: 'Assessment not found.' });
      return;
    }
    res.json(assessment);
  } catch (err) {
    next(err);
  }
}

export async function getDiscussions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = await readyStudent(req);
    const discussions = await Discussion.find({ studentId }).sort({ createdAt: -1 });
    res.json(discussions);
  } catch (err) {
    next(err);
  }
}

export async function joinDiscussion(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = await readyStudent(req);
    const discussion = await Discussion.findOneAndUpdate(
      { _id: req.params.id, studentId },
      { $set: { joined: true }, $inc: { votes: 1 } },
      { new: true },
    );
    if (!discussion) {
      res.status(404).json({ message: 'Discussion not found.' });
      return;
    }
    res.json(discussion);
  } catch (err) {
    next(err);
  }
}

export async function getChatPod(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = await readyStudent(req);
    const messages = await ChatPodMessage.find({ studentId }).sort({ createdAt: 1 });
    await ChatPodMessage.updateMany({ studentId, unread: true }, { unread: false });
    res.json(messages);
  } catch (err) {
    next(err);
  }
}

export async function postChatPod(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = await readyStudent(req);
    const user = await User.findById(studentId);
    const text = String(req.body.text ?? '').trim();
    if (!text) {
      res.status(400).json({ message: 'Message text is required.' });
      return;
    }
    const message = await ChatPodMessage.create({
      studentId,
      seedKey: `live-${Date.now()}`,
      sourcePage: 'chatPod',
      authorName: user?.name ?? 'You',
      authorInitials: (user?.name ?? 'Y').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
      text,
      unread: false,
    });
    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
}

export async function logPresence(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = await readyStudent(req);
    const seconds = Number(req.body.seconds);
    const date = String(req.body.date ?? '');
    if (!Number.isFinite(seconds) || seconds < 0) {
      res.status(400).json({ message: 'Seconds are required.' });
      return;
    }
    const week = await addOpenSeconds(studentId, seconds, date);
    res.json(week);
  } catch (err) {
    next(err);
  }
}

export async function logFocus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = await readyStudent(req);
    const seconds = Math.round(Number(req.body.seconds));
    const goalId = String(req.body.goalId || '');
    const date = String(req.body.date || '');
    if (!mongoose.isValidObjectId(goalId) || !Number.isFinite(seconds) || seconds < 30 || seconds > 10800) {
      res.status(400).json({ message: 'Choose a goal and a focus length.' });
      return;
    }
    const area = String(req.body.area || '').slice(0, 80);
    const result = await logFocusSession(studentId, goalId, seconds, date, area);
    if (!result) {
      res.status(404).json({ message: 'Goal not found.' });
      return;
    }
    const weekly = result.goal.seedKey === 'goal-weekly';
    res.json({
      minutes: Math.max(1, Math.round(seconds / 60)),
      goalTitle: result.goal.title,
      progress: weekly ? Math.min(100, Math.round(result.summary.percent)) : result.goal.progress,
      hoursDone: result.summary.hoursDone,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateWeeklyGoal(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = await readyStudent(req);
    const hoursGoal = Number(req.body.hoursGoal);
    if (!Number.isFinite(hoursGoal)) {
      res.status(400).json({ message: 'Weekly hours goal is required.' });
      return;
    }
    const week = await setWeeklyHoursGoal(studentId, hoursGoal);
    res.json(week);
  } catch (err) {
    next(err);
  }
}

export async function toggleGoal(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = await readyStudent(req);
    const { GoalPlan } = await import('../models/goalPlan');
    const planned = await GoalPlan.findOne({ _id: req.params.id, studentId });
    if (planned) {
      planned.completed = !planned.completed;
      planned.progress = planned.completed ? 100 : Math.min(planned.progress, 99);
      await planned.save();
      res.json(planned);
      return;
    }
    const goal = await StudyGoal.findOne({ _id: req.params.id, studentId });
    if (!goal) {
      res.status(404).json({ message: 'Goal not found.' });
      return;
    }
    goal.completed = !goal.completed;
    goal.current = goal.completed ? goal.total : Math.max(0, goal.total - 1);
    await goal.save();
    res.json(goal);
  } catch (err) {
    next(err);
  }
}

export async function progressActivity(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = await readyStudent(req);
    const activity = await LearningActivity.findOne({ _id: req.params.id, studentId });
    if (!activity) {
      res.status(404).json({ message: 'Activity not found.' });
      return;
    }
    if (activity.done < activity.total) {
      activity.done += 1;
      activity.minutesLeft = Math.max(0, activity.minutesLeft - 3);
      await activity.save();
    }
    res.json(activity);
  } catch (err) {
    next(err);
  }
}

export async function getLearningSessions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = await readyStudent(req);
    const sessions = await Session.find({ studentId })
      .populate('mentorId', 'name email')
      .sort({ scheduledAt: 1 });
    res.json(sessions);
  } catch (err) {
    next(err);
  }
}

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Session from '../models/Session';
import { GoalPlan, type GoalAssessmentLink, type GoalMilestone, type GoalTask, type IGoalPlan } from '../models/goalPlan';
import { ensureGoalPlans } from '../services/seedGoalPlans';
import { weekSummary } from '../services/studyPresence';
import { notify } from '../services/notify';
import { seedLearningData } from '../services/seedLearningData';

function asList<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function refresh(goal: IGoalPlan) {
  const milestones = asList<GoalMilestone>(goal.milestones);
  const done = milestones.filter((item) => item.status === 'done').length;
  if (milestones.length && done === milestones.length) {
    goal.completed = true;
    goal.progress = 100;
    goal.gradeLabel = 'A';
  } else if (goal.completed) {
    goal.completed = false;
  }
  goal.milestones = milestones;
}

function present(goal: IGoalPlan) {
  const milestones = asList<GoalMilestone>(goal.milestones);
  const tasks = asList<GoalTask>(goal.tasks);
  return {
    _id: goal._id,
    moduleCode: goal.moduleCode,
    moduleName: goal.moduleName,
    title: goal.title,
    summary: goal.summary,
    priority: goal.priority,
    progress: goal.progress,
    gradeLabel: goal.gradeLabel,
    targetPercent: goal.targetPercent,
    targetGrade: goal.targetGrade,
    delta: goal.delta,
    daysLeft: goal.daysLeft,
    dueLabel: goal.dueLabel,
    hoursLogged: goal.hoursLogged,
    supportLabel: goal.supportLabel,
    tutorName: goal.tutorName,
    tutorRole: goal.tutorRole,
    tutorSlot: goal.tutorSlot,
    topics: goal.topics,
    analytics: goal.analytics,
    milestones,
    milestoneDone: milestones.filter((item) => item.status === 'done').length,
    milestoneTotal: milestones.length,
    assessments: asList<GoalAssessmentLink>(goal.assessments),
    tasks,
    openTasks: tasks.filter((item) => item.status === 'open').length,
    tutors: goal.tutors,
    sessions: goal.sessions,
    credentialId: goal.credentialId,
    completed: goal.completed,
    seedKey: goal.seedKey,
  };
}

async function owned(req: AuthRequest, id: string) {
  const studentId = String(req.userId);
  await seedLearningData(studentId);
  await ensureGoalPlans(studentId);
  return GoalPlan.findOne({ _id: id, studentId });
}

export async function getGoalBoard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = String(req.userId);
    await seedLearningData(studentId);
    await ensureGoalPlans(studentId);
    const [goals, week] = await Promise.all([
      GoalPlan.find({ studentId }).sort({ createdAt: 1 }),
      weekSummary(studentId),
    ]);
    const ordered = [...goals].sort((a, b) => Number(b.seedKey === 'goal-weekly') - Number(a.seedKey === 'goal-weekly'));
    const primary = ordered.find((goal) => goal.seedKey !== 'goal-weekly') ?? ordered[0];
    const tasks = ordered.flatMap((goal) => asList<GoalTask>(goal.tasks).map((task) => ({ ...task, goalId: String(goal._id) })));
    res.json({
      moduleLabel: 'Weekly study goal',
      syncedLabel: 'Counted while the app is open',
      weekLabel: 'This week',
      hoursDone: week.hoursDone,
      hoursGoal: week.hoursGoal,
      percent: week.percent,
      weeklyGoalId: ordered.find((goal) => goal.seedKey === 'goal-weekly')?._id ?? null,
      days: week.days.map((day) => ({
        label: day.day,
        date: day.dateNumber,
        hours: day.hours,
        state: day.state,
      })),
      tasks,
      sessions: primary?.sessions ?? [],
      goals: ordered.map(present),
    });
  } catch (err) {
    next(err);
  }
}

export async function getGoal(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const goal = await owned(req, req.params.id);
    if (!goal) {
      res.status(404).json({ message: 'Goal not found.' });
      return;
    }
    res.json(present(goal));
  } catch (err) {
    next(err);
  }
}

export async function logGoalProgress(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const goal = await owned(req, req.params.id);
    if (!goal) {
      res.status(404).json({ message: 'Goal not found.' });
      return;
    }
    const hours = Number(req.body.hours) || 1.5;
    const problems = Number(req.body.problems) || 0;
    goal.hoursLogged = Math.round((goal.hoursLogged + hours) * 10) / 10;
    goal.progress = Math.min(100, goal.progress + Math.round(hours * 2));
    const milestones = asList<GoalMilestone>(goal.milestones);
    const active = milestones.find((item) => item.status === 'active');
    if (active) {
      active.detail = problems ? `${problems} problems logged` : active.detail;
      active.progressLabel = active.detail;
      if (problems >= 5) {
        active.status = 'done';
        active.dueLabel = 'Done';
        const nextLocked = milestones.find((item) => item.status === 'locked');
        if (nextLocked) nextLocked.status = 'active';
      }
    }
    goal.milestones = milestones;
    refresh(goal);
    await goal.save();
    res.json(present(goal));
  } catch (err) {
    next(err);
  }
}

export async function addGoalAssessment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const goal = await owned(req, req.params.id);
    if (!goal) {
      res.status(404).json({ message: 'Goal not found.' });
      return;
    }
    const name = String(req.body.name ?? '').trim();
    if (!name) {
      res.status(400).json({ message: 'Assessment name is required.' });
      return;
    }
    const type = ['Exam', 'Assignment', 'Quiz'].includes(req.body.type) ? req.body.type : 'Quiz';
    const item: GoalAssessmentLink = {
      id: `a-${Date.now()}`,
      name,
      type,
      dateLabel: req.body.dateLabel || 'Scheduled',
      timeLabel: req.body.timeLabel || '09:00',
      totalMarks: Number(req.body.totalMarks) || 100,
      targetMark: Number(req.body.targetMark) || 85,
      weight: Number(req.body.weight) || 10,
      score: null,
      statusLabel: 'Linked',
    };
    goal.assessments = [...asList<GoalAssessmentLink>(goal.assessments), item];
    await goal.save();
    res.status(201).json(present(goal));
  } catch (err) {
    next(err);
  }
}

export async function updateGoalAssessment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const goal = await owned(req, req.params.id);
    if (!goal) {
      res.status(404).json({ message: 'Goal not found.' });
      return;
    }
    const score = Number(req.body.score);
    const assessments = asList<GoalAssessmentLink>(goal.assessments).map((item) => {
      if (item.id !== req.params.assessmentId) return item;
      return {
        ...item,
        score: Number.isFinite(score) ? score : item.score,
        statusLabel: 'Graded',
        feedback: req.body.feedback || item.feedback,
      };
    });
    goal.assessments = assessments;
    await goal.save();
    res.json(present(goal));
  } catch (err) {
    next(err);
  }
}

export async function advanceMilestone(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const goal = await owned(req, req.params.id);
    if (!goal) {
      res.status(404).json({ message: 'Goal not found.' });
      return;
    }
    const milestones = asList<GoalMilestone>(goal.milestones);
    const current = milestones.find((item) => item.id === req.params.milestoneId) ?? milestones.find((item) => item.status === 'active');
    if (current && current.status !== 'locked') {
      current.status = 'done';
      current.dueLabel = 'Done';
      current.detail = 'Done';
      const nextLocked = milestones.find((item) => item.status === 'locked');
      if (nextLocked) {
        nextLocked.status = 'active';
        nextLocked.detail = 'In progress';
      }
    }
    goal.milestones = milestones;
    const done = milestones.filter((item) => item.status === 'done').length;
    goal.progress = Math.max(goal.progress, Math.round((done / Math.max(milestones.length, 1)) * 100));
    refresh(goal);
    await goal.save();
    res.json(present(goal));
  } catch (err) {
    next(err);
  }
}

export async function addGoalMilestone(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const goal = await owned(req, req.params.id);
    if (!goal) {
      res.status(404).json({ message: 'Goal not found.' });
      return;
    }
    const title = String(req.body.title ?? '').trim();
    if (!title) {
      res.status(400).json({ message: 'Milestone title is required.' });
      return;
    }
    const milestones = asList<GoalMilestone>(goal.milestones);
    const item: GoalMilestone = {
      id: `m-${Date.now()}`,
      title,
      detail: 'Not started',
      status: milestones.some((entry) => entry.status === 'active') ? 'locked' : 'active',
      dueLabel: req.body.dueLabel || 'Upcoming',
    };
    goal.milestones = [...milestones, item];
    refresh(goal);
    await goal.save();
    res.status(201).json(present(goal));
  } catch (err) {
    next(err);
  }
}

export async function addGoalTask(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const goal = await owned(req, req.params.id);
    if (!goal) {
      res.status(404).json({ message: 'Goal not found.' });
      return;
    }
    const title = String(req.body.title ?? '').trim();
    if (!title) {
      res.status(400).json({ message: 'Task title is required.' });
      return;
    }
    const task: GoalTask = {
      id: `task-${Date.now()}`,
      title,
      kind: req.body.kind || 'Problem Set',
      minutes: Number(req.body.minutes) || 30,
      dueLabel: req.body.dueLabel || 'Due today',
      status: 'open',
    };
    goal.tasks = [...asList<GoalTask>(goal.tasks), task];
    await goal.save();
    res.status(201).json(present(goal));
  } catch (err) {
    next(err);
  }
}

export async function completeGoalTask(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const goal = await owned(req, req.params.id);
    if (!goal) {
      res.status(404).json({ message: 'Goal not found.' });
      return;
    }
    goal.tasks = asList<GoalTask>(goal.tasks).map((task) => (
      task.id === req.params.taskId ? { ...task, status: task.status === 'done' ? 'open' as const : 'done' as const } : task
    ));
    await goal.save();
    res.json(present(goal));
  } catch (err) {
    next(err);
  }
}

export async function bookGoalTutor(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const goal = await owned(req, req.params.id);
    if (!goal) {
      res.status(404).json({ message: 'Goal not found.' });
      return;
    }
    const tutors = asList<{ key: string; name: string; slot: string }>(goal.tutors);
    const tutor = tutors.find((item) => item.key === req.body.tutorKey) ?? tutors[0];
    const mentor = tutor?.name
      ? await User.findOne({ role: 'mentor', name: tutor.name })
      : null;
    if (!mentor) {
      res.status(400).json({ message: 'Book this session from Find a Tutor so it reaches that tutor.' });
      return;
    }
    const session = await Session.create({
      mentorId: mentor._id,
      studentId: req.userId,
      subject: `${goal.moduleCode} ${goal.title}`,
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      notes: `Booked ${tutor?.name ?? mentor.name} · ${tutor?.slot ?? 'next open slot'}`,
      durationMin: 60,
      status: 'pending',
    });
    const student = await User.findById(req.userId).select('name');
    await notify(mentor._id, {
      kind: 'booking',
      title: 'Goal session request',
      body: `${student?.name || 'A student'} booked ${session.subject}.`,
      refId: String(session._id),
    });
    res.status(201).json({ sessionId: session._id, tutorName: mentor.name, slot: tutor?.slot });
  } catch (err) {
    next(err);
  }
}

export async function goalSummaries(studentId: string) {
  await ensureGoalPlans(studentId);
  const [goals, week] = await Promise.all([
    GoalPlan.find({ studentId }).sort({ createdAt: 1 }),
    weekSummary(studentId),
  ]);
  const ordered = [...goals].sort((a, b) => Number(b.seedKey === 'goal-weekly') - Number(a.seedKey === 'goal-weekly'));
  return ordered.map((goal) => {
    const weekly = goal.seedKey === 'goal-weekly';
    const milestones = asList<GoalMilestone>(goal.milestones);
    const done = milestones.filter((item) => item.status === 'done').length;
    return {
      _id: goal._id,
      title: goal.title,
      dueLabel: weekly ? 'This week · app open time' : `${goal.moduleCode} · ${goal.dueLabel}`,
      current: weekly ? week.hoursDone : done,
      total: weekly ? week.hoursGoal : (milestones.length || 1),
      completed: weekly ? week.hoursDone >= week.hoursGoal : goal.completed,
      moduleCode: goal.moduleCode,
      progress: weekly ? Math.min(100, Math.round(week.percent)) : goal.progress,
      priority: goal.priority,
      kind: weekly ? 'weekly' : 'module',
      areas: (() => {
        const topics = asList<{ title?: string }>(goal.topics).map((item) => item.title).filter((title): title is string => Boolean(title));
        if (topics.length) return topics;
        return asList<GoalTask>(goal.tasks).map((task) => task.title).filter(Boolean);
      })(),
    };
  });
}

import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { PodConversation } from '../models/pod';
import { LibraryMaterial } from '../models/library';
import { seedPodData } from '../services/seedPodData';
import { seedLibraryData } from '../services/seedLibraryData';

type LibraryView = {
  _id: unknown;
  kind: string;
  source: string;
  title: string;
  subtitle?: string;
  fromLabel?: string;
  description?: string;
  moduleCode?: string;
  moduleName?: string;
  durationLabel?: string;
  sizeLabel?: string;
  pageCount?: number;
  fileCount?: number;
  questionCount?: number;
  downloads?: number;
  owner?: unknown;
  conversation?: unknown;
  savedBy?: unknown[];
  tags?: string[];
  createdAt?: Date;
  body?: string;
  files?: { name: string; language: string; content: string }[];
  questions?: { prompt: string; options: string[]; answer?: number; explanation?: string }[];
  progress?: Map<string, Record<string, number | boolean>> | Record<string, Record<string, number | boolean>>;
};

function progressFor(item: LibraryView, userId: string) {
  const raw = item.progress;
  if (raw instanceof Map) return (raw.get(userId) ?? {}) as Record<string, number | boolean>;
  return ((raw as Record<string, Record<string, number | boolean>> | undefined)?.[userId] ?? {});
}

function ownerNameOf(item: LibraryView) {
  const owner = item.owner as { name?: string } | string | undefined;
  return typeof owner === 'object' && owner?.name ? owner.name : undefined;
}

function conversationTitleOf(item: LibraryView) {
  const conversation = item.conversation as { title?: string } | string | undefined;
  return typeof conversation === 'object' && conversation?.title ? conversation.title : undefined;
}

function buildFromLabel(item: LibraryView) {
  if (item.fromLabel) return item.fromLabel;
  const owner = (ownerNameOf(item) ?? 'Tutor').toUpperCase();
  const group = (conversationTitleOf(item) ?? 'Study Group').toUpperCase();
  if (item.source === 'live') return `FROM: LIVE KUPPIYA • ${owner} (TUTOR)`;
  if (item.source === 'group') return `FROM: ${group} (STUDY GROUP)`;
  if (item.source === 'session') return `FROM: POD SESSION • ${owner}`;
  return `FROM: ${(item.moduleName || 'LIBRARY PACK').toUpperCase()}`;
}

function serialize(item: LibraryView, userId: string, full = false) {
  const mine = progressFor(item, userId);
  const saved = (item.savedBy ?? []).some((id) => String(id) === userId) || Boolean(mine.saved);
  return {
    _id: item._id,
    kind: item.kind,
    source: item.source,
    title: item.title,
    subtitle: item.subtitle,
    fromLabel: buildFromLabel(item),
    preview: item.files?.[0]?.content?.split('\n').slice(0, 4).join('\n'),
    ownerName: ownerNameOf(item),
    conversationTitle: conversationTitleOf(item),
    description: item.description,
    moduleCode: item.moduleCode,
    moduleName: item.moduleName,
    durationLabel: item.durationLabel,
    sizeLabel: item.sizeLabel,
    pageCount: item.pageCount,
    fileCount: item.fileCount ?? item.files?.length ?? 0,
    questionCount: item.questionCount ?? item.questions?.length ?? 0,
    downloads: item.downloads,
    owner: item.owner,
    conversation: item.conversation,
    saved,
    tags: item.tags ?? [],
    createdAt: item.createdAt,
    body: full ? item.body : undefined,
    files: full ? item.files : undefined,
    questions: full
      ? (item.questions ?? []).map((question) => ({
        prompt: question.prompt,
        options: question.options,
      }))
      : undefined,
    watchedPercent: mine.watchedPercent ?? 0,
    quizScore: mine.quizScore,
    quizBest: mine.quizBest,
    audioSpeed: mine.audioSpeed ?? 1,
    completed: Boolean(mine.completed),
  };
}

async function ready(req: AuthRequest) {
  const userId = String(req.userId);
  await seedPodData(userId);
  await seedLibraryData(userId);
  return userId;
}

async function visibleQuery(userId: string, conversationId?: string) {
  const conversations = await PodConversation.find({ participants: userId }).select('_id');
  const ids = conversations.map((item) => item._id);
  const access = {
    $or: [
      { conversation: { $exists: false } },
      { conversation: null },
      { conversation: { $in: ids } },
      { owner: userId },
    ],
  };
  if (conversationId && mongoose.isValidObjectId(conversationId)) {
    return { $and: [access, { $or: [{ conversation: conversationId }, { conversation: { $exists: false } }, { conversation: null }] }] };
  }
  return access;
}

export async function listLibrary(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = await ready(req);
    const kind = String(req.query.kind ?? 'all');
    const source = String(req.query.source ?? 'all');
    const q = String(req.query.q ?? '').trim();
    const conversationId = req.query.conversationId ? String(req.query.conversationId) : undefined;
    const filter: Record<string, unknown> = await visibleQuery(userId, conversationId);
    const extra: Record<string, unknown> = {};
    if (source !== 'all') extra.source = source;
    if (q) extra.$or = [
      { title: new RegExp(q, 'i') },
      { subtitle: new RegExp(q, 'i') },
      { body: new RegExp(q, 'i') },
      { moduleCode: new RegExp(q, 'i') },
    ];
    const match = Object.keys(extra).length ? { $and: [filter, extra] } : filter;
    const items = await LibraryMaterial.find(kind === 'all' ? match : { $and: [match, { kind }] })
      .select('-files -questions -body -progress')
      .sort({ createdAt: -1 })
      .lean();
    const kindRows = await LibraryMaterial.aggregate<{ _id: string; count: number }>([
      { $match: match },
      { $group: { _id: '$kind', count: { $sum: 1 } } },
    ]);
    const kindCount = Object.fromEntries(kindRows.map((row) => [row._id, row.count]));
    const kindMeta = [
      { key: 'video', label: 'Videos', icon: 'video' },
      { key: 'pdf', label: 'PDF Notes', icon: 'pdf' },
      { key: 'quiz', label: 'Quizzes', icon: 'quiz' },
      { key: 'audio', label: 'Audio', icon: 'audio' },
      { key: 'code', label: 'Code', icon: 'code' },
    ] as const;
    const total = kindRows.reduce((sum, row) => sum + row.count, 0);
    const kinds = [
      { key: 'all', label: 'All', icon: 'all', count: total },
      ...kindMeta
        .filter((item) => (kindCount[item.key] ?? 0) > 0)
        .map((item) => ({ ...item, count: kindCount[item.key] ?? 0 })),
    ];
    const saved = items.filter((item) => (item.savedBy ?? []).some((id) => String(id) === userId)).length;
    res.json({
      saved,
      offlineItems: saved,
      offlineSize: `${Math.max(1, saved * 28)} MB`,
      kinds,
      items: items.map((item) => serialize(item, userId)),
    });
  } catch (error) {
    next(error);
  }
}

export async function getLibraryItem(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = await ready(req);
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(404).json({ message: 'Material not found.' });
      return;
    }
    const access = await visibleQuery(userId);
    const item = await LibraryMaterial.findOne({ _id: req.params.id, ...(access as object) });
    if (!item) {
      res.status(404).json({ message: 'Material not found.' });
      return;
    }
    res.json(serialize(item, userId, true));
  } catch (error) {
    next(error);
  }
}

export async function createLibraryItem(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = await ready(req);
    const title = String(req.body.title ?? '').trim();
    const kind = String(req.body.kind ?? 'pdf');
    if (!title) {
      res.status(400).json({ message: 'Title is required.' });
      return;
    }
    if (!['video', 'pdf', 'quiz', 'audio', 'code'].includes(kind)) {
      res.status(400).json({ message: 'Unsupported material type.' });
      return;
    }
    let conversation: string | undefined;
    if (req.body.conversationId && mongoose.isValidObjectId(req.body.conversationId)) {
      const owned = await PodConversation.findOne({ _id: req.body.conversationId, participants: userId });
      if (owned) conversation = String(owned._id);
    }
    const questions = Array.isArray(req.body.questions) ? req.body.questions : [];
    const files = Array.isArray(req.body.files) ? req.body.files : [];
    const item = await LibraryMaterial.create({
      kind,
      source: ['group', 'session', 'live', 'library'].includes(String(req.body.source)) ? req.body.source : 'library',
      title,
      subtitle: String(req.body.subtitle ?? ''),
      fromLabel: String(req.body.fromLabel ?? ''),
      description: String(req.body.description ?? ''),
      body: String(req.body.body ?? ''),
      moduleCode: String(req.body.moduleCode ?? ''),
      moduleName: String(req.body.moduleName ?? ''),
      durationLabel: req.body.durationLabel,
      sizeLabel: req.body.sizeLabel,
      pageCount: req.body.pageCount,
      fileCount: files.length || undefined,
      questionCount: questions.length || undefined,
      owner: userId,
      conversation,
      savedBy: [userId],
      questions,
      files,
      tags: Array.isArray(req.body.tags) ? req.body.tags : [],
    });
    res.status(201).json(serialize(item, userId, true));
  } catch (error) {
    next(error);
  }
}

export async function saveLibraryItem(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = await ready(req);
    const item = await LibraryMaterial.findById(req.params.id);
    if (!item) {
      res.status(404).json({ message: 'Material not found.' });
      return;
    }
    await LibraryMaterial.updateOne({ _id: item._id }, { $addToSet: { savedBy: userId }, $inc: { downloads: 1 } });
    const updated = await LibraryMaterial.findById(item._id);
    res.json(serialize(updated!, userId, true));
  } catch (error) {
    next(error);
  }
}

export async function progressLibraryItem(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = await ready(req);
    const item = await LibraryMaterial.findById(req.params.id);
    if (!item) {
      res.status(404).json({ message: 'Material not found.' });
      return;
    }
    const current = progressFor(item, userId);
    const nextProgress = {
      ...current,
      watchedPercent: req.body.watchedPercent ?? current.watchedPercent,
      audioSpeed: req.body.audioSpeed ?? current.audioSpeed,
      completed: req.body.completed ?? current.completed,
      saved: true,
    };
    if (!(item.progress instanceof Map)) item.progress = new Map();
    item.progress.set(userId, nextProgress);
    if (!item.savedBy.some((id) => String(id) === userId)) item.savedBy.push(new mongoose.Types.ObjectId(userId));
    await item.save();
    res.json(serialize(item, userId, true));
  } catch (error) {
    next(error);
  }
}

export async function submitLibraryQuiz(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = await ready(req);
    const item = await LibraryMaterial.findById(req.params.id);
    if (!item || item.kind !== 'quiz') {
      res.status(404).json({ message: 'Quiz not found.' });
      return;
    }
    const answers: number[] = Array.isArray(req.body.answers) ? req.body.answers.map(Number) : [];
    let correct = 0;
    const review = item.questions.map((question, index) => {
      const picked = answers[index];
      const ok = picked === question.answer;
      if (ok) correct += 1;
      return {
        prompt: question.prompt,
        options: question.options,
        picked,
        answer: question.answer,
        explanation: question.explanation,
        correct: ok,
      };
    });
    const score = item.questions.length ? Math.round((correct / item.questions.length) * 100) : 0;
    const current = progressFor(item, userId);
    const best = Math.max(Number(current.quizBest ?? 0), score);
    if (!(item.progress instanceof Map)) item.progress = new Map();
    item.progress.set(userId, { ...current, quizScore: score, quizBest: best, completed: true, saved: true });
    await item.save();
    res.json({
      ...serialize(item, userId, true),
      quizScore: score,
      quizBest: best,
      correct,
      total: item.questions.length,
      review,
    });
  } catch (error) {
    next(error);
  }
}

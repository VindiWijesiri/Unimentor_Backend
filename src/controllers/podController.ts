import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import { PodConversation, PodMessage } from '../models/pod';
import { seedPodData } from '../services/seedPodData';

function timeAgo(date?: Date) {
  if (!date) return '';
  const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function clock(date?: Date) {
  if (!date) return '';
  return new Date(date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function initials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

type ConversationView = {
  _id: unknown;
  type: string;
  category: string;
  title: string;
  lastMessageText?: string;
  lastSenderName?: string;
  lastMessageAt?: Date;
  unreadCounts?: Map<string, number> | Record<string, number>;
  participants?: unknown[];
  meta?: Record<string, unknown>;
};

function unreadMap(conversation: ConversationView) {
  const counts = conversation.unreadCounts;
  if (counts instanceof Map) return counts;
  return new Map(Object.entries((counts ?? {}) as Record<string, number>));
}

function unreadFor(conversation: ConversationView, userId: string) {
  return unreadMap(conversation).get(userId) ?? 0;
}

function serializeConversation(conversation: ConversationView, userId: string) {
  return {
    _id: conversation._id,
    type: conversation.type,
    category: conversation.category,
    title: conversation.title,
    lastMessageText: conversation.lastMessageText,
    lastSenderName: conversation.lastSenderName,
    lastMessageAt: conversation.lastMessageAt,
    timeLabel: conversation.type === 'group' ? clock(conversation.lastMessageAt) : timeAgo(conversation.lastMessageAt),
    unreadCount: unreadFor(conversation, userId),
    participantCount: conversation.participants?.length ?? 0,
    meta: conversation.meta ?? {},
  };
}

async function ready(req: AuthRequest) {
  const userId = String(req.userId);
  await seedPodData(userId);
  return userId;
}

async function ownedConversation(id: string, userId: string) {
  if (!mongoose.isValidObjectId(id)) return null;
  return PodConversation.findOne({ _id: id, participants: userId });
}

export async function listPodConversations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = await ready(req);
    const filter = String(req.query.filter ?? 'all');
    const conversations = await PodConversation.find({ participants: userId })
      .select('type category title lastMessageText lastSenderName lastMessageAt unreadCounts participants meta')
      .sort({ lastMessageAt: -1 })
      .lean();
    const items = conversations.map((item) => serializeConversation(item, userId));
    const counts = { all: items.length, groups: 0, tutors: 0, peers: 0 };
    const dots = { groups: false, tutors: false, peers: false };
    items.forEach((item) => {
      const key = item.category === 'squad' || item.category === 'circle'
        ? 'groups'
        : item.category === 'tutor' ? 'tutors' : 'peers';
      counts[key] += 1;
      if (item.unreadCount > 0) dots[key] = true;
    });
    const filters = [
      { key: 'all', label: 'All', icon: 'all', count: counts.all },
      { key: 'groups', label: 'Study Groups', icon: 'groups', count: counts.groups, dot: dots.groups },
      { key: 'tutors', label: 'Tutors', icon: 'tutors', count: counts.tutors, dot: dots.tutors },
      { key: 'peers', label: 'Peers', icon: 'peers', count: counts.peers, dot: dots.peers },
    ].filter((item) => item.key === 'all' || item.count > 0);
    const visible = filter === 'all'
      ? items
      : items.filter((item) => {
        if (filter === 'groups') return item.category === 'squad' || item.category === 'circle';
        if (filter === 'tutors') return item.category === 'tutor';
        return item.category === 'mentor' || item.category === 'kuppiya';
      });
    res.json({ items: visible, filters });
  } catch (error) {
    next(error);
  }
}

export async function getPodFeed(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = await ready(req);
    const conversations = await PodConversation.find({ participants: userId })
      .select('type category title lastMessageText lastSenderName lastMessageAt unreadCounts participants meta seedKey')
      .sort({ lastMessageAt: -1 })
      .lean();
    const featured = conversations.filter((item) => item.seedKey === 'pod-dsa-squad' || item.category === 'kuppiya').slice(0, 2);
    const items = (featured.length ? featured : conversations.slice(0, 2)).map((item) => serializeConversation(item, userId));
    res.json({
      total: conversations.length,
      unread: conversations.reduce((sum, item) => sum + unreadFor(item, userId), 0),
      items,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPodConversation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = await ready(req);
    const conversation = await ownedConversation(req.params.id, userId);
    if (!conversation) {
      res.status(404).json({ message: 'Conversation not found.' });
      return;
    }
    const participants = await User.find({ _id: { $in: conversation.participants } }).select('name email role');
    res.json({
      ...serializeConversation(conversation, userId),
      participants: participants.map((user) => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        initials: initials(user.name),
      })),
    });
  } catch (error) {
    next(error);
  }
}

export async function getPodMessages(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = await ready(req);
    const conversation = await ownedConversation(req.params.id, userId);
    if (!conversation) {
      res.status(404).json({ message: 'Conversation not found.' });
      return;
    }
    const peek = String(req.query.peek ?? '') === '1';
    const messages = await PodMessage.find({ conversation: conversation._id }).sort({ createdAt: 1 }).limit(200).lean();
    if (!peek) {
      await PodMessage.updateMany(
        { conversation: conversation._id, readBy: { $ne: userId } },
        { $addToSet: { readBy: userId } },
      );
      const counts = unreadMap(conversation);
      counts.set(userId, 0);
      conversation.unreadCounts = counts;
      conversation.meta = { ...conversation.meta, isNew: false };
      await conversation.save();
    }
    res.json(messages);
  } catch (error) {
    next(error);
  }
}

export async function sendPodMessage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = await ready(req);
    const text = String(req.body.text ?? '').trim();
    if (!text || text.length > 2000) {
      res.status(400).json({ message: 'Message must contain 1 to 2000 characters.' });
      return;
    }
    const conversation = await ownedConversation(req.params.id, userId);
    if (!conversation) {
      res.status(404).json({ message: 'Conversation not found.' });
      return;
    }
    const sender = await User.findById(userId);
    const message = await PodMessage.create({
      conversation: conversation._id,
      sender: userId,
      senderName: sender?.name ?? 'You',
      senderInitials: initials(sender?.name ?? 'You'),
      text,
      kind: 'text',
      readBy: [userId],
    });
    conversation.lastMessageText = text;
    conversation.lastMessageAt = message.createdAt;
    conversation.lastSenderName = sender?.name ?? 'You';
    const counts = unreadMap(conversation);
    conversation.participants.forEach((participant) => {
      const id = String(participant);
      if (id !== userId) counts.set(id, (counts.get(id) ?? 0) + 1);
    });
    conversation.unreadCounts = counts;
    await conversation.save();
    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
}

export async function votePodConversation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = await ready(req);
    const conversation = await ownedConversation(req.params.id, userId);
    if (!conversation) {
      res.status(404).json({ message: 'Conversation not found.' });
      return;
    }
    const voted = String(conversation.meta.votedUserIds ?? '').split(',').filter(Boolean);
    if (!voted.includes(userId)) {
      voted.push(userId);
      conversation.meta = {
        ...conversation.meta,
        pollVotes: (conversation.meta.pollVotes ?? 0) + 1,
        votedUserIds: voted.join(','),
      };
      await conversation.save();
    }
    res.json(serializeConversation(conversation, userId));
  } catch (error) {
    next(error);
  }
}

export async function respondPodProposal(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = await ready(req);
    const status = req.body.status === 'declined' ? 'declined' : 'accepted';
    const conversation = await ownedConversation(req.params.id, userId);
    if (!conversation) {
      res.status(404).json({ message: 'Conversation not found.' });
      return;
    }
    conversation.meta = { ...conversation.meta, proposalStatus: status, actionLabel: status === 'accepted' ? 'BOOKED' : 'DECLINED' };
    const sender = await User.findById(userId);
    const message = await PodMessage.create({
      conversation: conversation._id,
      sender: userId,
      senderName: sender?.name ?? 'You',
      senderInitials: initials(sender?.name ?? 'You'),
      text: status === 'accepted' ? 'Accepted the Flash Kuppiya and booked the slot.' : 'Declined the Flash Kuppiya proposal.',
      kind: 'text',
      readBy: [userId],
    });
    conversation.lastMessageText = message.text;
    conversation.lastMessageAt = message.createdAt;
    conversation.lastSenderName = sender?.name ?? 'You';
    await conversation.save();
    res.json(serializeConversation(conversation, userId));
  } catch (error) {
    next(error);
  }
}

export async function createPodSquad(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = await ready(req);
    const title = String(req.body.title ?? '').trim();
    const moduleCode = String(req.body.moduleCode ?? '').trim();
    const goal = String(req.body.goal ?? '').trim();
    if (!title) {
      res.status(400).json({ message: 'Group title is required.' });
      return;
    }
    const inviteIds: string[] = Array.isArray(req.body.participantIds)
      ? (req.body.participantIds as unknown[]).map(String).filter((id) => mongoose.isValidObjectId(id))
      : [];
    const sender = await User.findById(userId);
    const invitees = [...new Set(inviteIds.filter((id) => id !== userId))];
    const unreadCounts: Record<string, number> = {};
    invitees.forEach((id) => { unreadCounts[id] = 1; });
    const conversation = await PodConversation.create({
      type: 'group',
      category: 'squad',
      title,
      participants: [...new Set([userId, ...inviteIds])],
      createdBy: userId,
      lastMessageText: 'Squad created. Invite your peers.',
      lastMessageAt: new Date(),
      lastSenderName: sender?.name ?? 'You',
      unreadCounts,
      meta: {
        leadName: sender?.name,
        leadInitials: initials(sender?.name ?? 'Y'),
        memberCount: 1 + inviteIds.length,
        subtitle: moduleCode || 'Study squad',
        moduleCode,
        assessmentHint: goal,
      },
    });
    await PodMessage.create({
      conversation: conversation._id,
      sender: userId,
      senderName: sender?.name ?? 'You',
      senderInitials: initials(sender?.name ?? 'You'),
      text: goal || `${title} is ready. Let’s start revising together.`,
      kind: 'text',
      readBy: [userId],
    });
    res.status(201).json(serializeConversation(conversation, userId));
  } catch (error) {
    next(error);
  }
}

export async function listPodPeople(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = await ready(req);
    const q = String(req.query.q ?? '').trim();
    const filter: Record<string, unknown> = { _id: { $ne: userId } };
    if (q) {
      const clauses: Record<string, unknown>[] = [
        { name: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        { email: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      ];
      if (mongoose.isValidObjectId(q)) clauses.push({ _id: q });
      if (/^[a-fA-F0-9]{6,24}$/.test(q)) {
        clauses.push({ $expr: { $regexMatch: { input: { $toString: '$_id' }, regex: q, options: 'i' } } });
      }
      filter.$or = clauses;
    }
    const people = await User.find(filter).select('name email role rating').limit(40).lean();
    res.json(people.map((user) => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      userCode: user.email?.split('@')[0] ?? String(user._id).slice(-8),
      role: user.role,
      initials: initials(user.name),
      rating: user.rating ?? 0,
    })));
  } catch (error) {
    next(error);
  }
}

export async function getPodUnread(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = await ready(req);
    const conversations = await PodConversation.find({ participants: userId }).select('unreadCounts').lean();
    res.json({
      unread: conversations.reduce((sum, item) => sum + unreadFor(item, userId), 0),
    });
  } catch (error) {
    next(error);
  }
}

export async function markPodRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = await ready(req);
    const conversation = await ownedConversation(req.params.id, userId);
    if (!conversation) {
      res.status(404).json({ message: 'Conversation not found.' });
      return;
    }
    await PodMessage.updateMany(
      { conversation: conversation._id, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } },
    );
    const counts = unreadMap(conversation);
    counts.set(userId, 0);
    conversation.unreadCounts = counts;
    conversation.meta = { ...conversation.meta, isNew: false };
    await conversation.save();
    res.json(serializeConversation(conversation, userId));
  } catch (error) {
    next(error);
  }
}

export async function startDirectConversation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = await ready(req);
    const otherId = String(req.body.participantId ?? '');
    if (!mongoose.isValidObjectId(otherId) || otherId === userId) {
      res.status(400).json({ message: 'A valid participant is required.' });
      return;
    }
    const other = await User.findById(otherId);
    if (!other) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }
    const existing = await PodConversation.findOne({
      type: 'direct',
      participants: { $all: [userId, otherId], $size: 2 },
    });
    if (existing) {
      res.json(serializeConversation(existing, userId));
      return;
    }
    const sender = await User.findById(userId);
    const conversation = await PodConversation.create({
      type: 'direct',
      category: other.role === 'mentor' ? 'tutor' : 'kuppiya',
      title: other.name,
      participants: [userId, otherId],
      createdBy: userId,
      lastMessageText: 'Conversation started.',
      lastMessageAt: new Date(),
      lastSenderName: sender?.name ?? 'You',
      unreadCounts: {},
      meta: {
        leadName: other.name,
        leadInitials: initials(other.name),
        subtitle: other.role === 'mentor' ? 'Tutor chat' : 'Peer chat',
      },
    });
    res.status(201).json(serializeConversation(conversation, userId));
  } catch (error) {
    next(error);
  }
}

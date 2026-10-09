import User from '../models/User';
import ChatMessage from '../models/ChatMessage';
import { PodConversation, PodMessage } from '../models/pod';
import { memoizeSeed } from './seedCache';

const TUTOR_EMAIL = 'tharushi.perera@unimentor.test';
const KASUN_EMAIL = 'kasun.jayawardena@unimentor.test';
const SANDUNI_EMAIL = 'sanduni.perera@unimentor.test';
const KAVINDI_EMAIL = 'kavindi.rathnayake@unimentor.test';

function initials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

async function ensureUser(name: string, email: string, role: 'student' | 'mentor', extra: Record<string, unknown> = {}) {
  const existing = await User.findOne({ email });
  if (existing) return existing;
  return User.create({
    name,
    email,
    password: 'Password123',
    role,
    subjects: ['Data Structures', 'Algorithms'],
    ...extra,
  });
}

async function addParticipant(conversationId: unknown, userId: string) {
  await PodConversation.updateOne(
    { _id: conversationId, participants: { $ne: userId } },
    { $addToSet: { participants: userId } },
  );
}

async function seedPodDataOnce(userId: string): Promise<void> {
  try {
  const sharedCount = await PodConversation.countDocuments({
    seedKey: { $in: ['pod-dsa-squad', 'pod-stats-circle', 'pod-flash-kuppiya'] },
    participants: userId,
  });
  if (sharedCount >= 3) {
    const user = await User.findById(userId).select('role');
    if (!user || user.role !== 'student') return;
    const hasTutorThread = await PodConversation.exists({
      $or: [
        { seedKey: `pod-tutor-${userId}` },
        { seedKey: 'pod-tutor-tharushi-kasun', participants: userId },
        { category: 'tutor', participants: userId },
      ],
    });
    if (hasTutorThread) return;
  }

  const [tharushi, kasun, sanduni, kavindi, current] = await Promise.all([
    ensureUser('Tharushi Perera', TUTOR_EMAIL, 'mentor', { bio: 'DSA lead tutor', rating: 4.9, reviewCount: 28 }),
    ensureUser('Kasun Jayawardena', KASUN_EMAIL, 'student'),
    ensureUser('Sanduni Perera', SANDUNI_EMAIL, 'student'),
    ensureUser('Kavindi Rathnayake', KAVINDI_EMAIL, 'student'),
    User.findById(userId),
  ]);
  if (!current) return;

  const people = [tharushi, kasun, sanduni, kavindi, current];
  const uniquePeople = [...new Map(people.map((user) => [String(user._id), user])).values()];

  let squad = await PodConversation.findOne({ seedKey: 'pod-dsa-squad' });
  if (!squad) {
    squad = await PodConversation.create({
      seedKey: 'pod-dsa-squad',
      type: 'group',
      category: 'squad',
      title: 'DSA Revision Squad',
      participants: uniquePeople.map((user) => user._id),
      createdBy: tharushi._id,
      lastMessageText: 'Voice note: Key hints on BFS vs Dijkstra',
      lastMessageAt: new Date(Date.now() - 3 * 60 * 1000),
      lastSenderName: 'Tharushi Perera',
      unreadCounts: { [userId]: 1 },
      meta: {
        leadName: 'Tharushi Perera',
        leadInitials: 'TP',
        memberCount: 18,
        subtitle: 'Tharushi · Group · 18 Peers',
        assessmentTitle: 'Mid-Semester Mock Test 01',
        assessmentProgress: '14/20 submitted · 73% Avg',
        assessmentHint: 'Kahn vs BFS topological sorting',
        voicePreview: 'Key hints on BFS vs Dijkstra',
        isNew: true,
        moduleCode: 'IT2040',
      },
    });

    await PodMessage.insertMany([
      {
        conversation: squad._id,
        sender: tharushi._id,
        senderName: 'System',
        senderInitials: 'UM',
        text: 'Mid-Semester Mock Test 01 is open.',
        kind: 'assessment',
        readBy: [tharushi._id],
        meta: { progress: '14/20 submitted · 73% Avg', hint: 'Open specifically for question 4 regarding topological sorting.' },
        createdAt: new Date(Date.now() - 80 * 60 * 1000),
      },
      {
        conversation: squad._id,
        sender: tharushi._id,
        senderName: 'Tharushi Perera',
        senderInitials: 'TP',
        text: "Here you go Sanduni, I've annotated question 4 with Kahn's algorithm vs BFS topological sorting.",
        kind: 'text',
        readBy: [tharushi._id],
        createdAt: new Date(Date.now() - 55 * 60 * 1000),
      },
      {
        conversation: squad._id,
        sender: tharushi._id,
        senderName: 'Tharushi Perera',
        senderInitials: 'TP',
        text: '2023_DSA_Midterm_Paper_Soln.pdf',
        kind: 'file',
        readBy: [tharushi._id],
        createdAt: new Date(Date.now() - 50 * 60 * 1000),
      },
      {
        conversation: squad._id,
        sender: tharushi._id,
        senderName: 'Tharushi Perera',
        senderInitials: 'TP',
        text: 'Voice Clarification: Back-edge vs Cross-edge',
        kind: 'voice',
        readBy: [tharushi._id],
        meta: { duration: '0:42' },
        createdAt: new Date(Date.now() - 12 * 60 * 1000),
      },
      {
        conversation: squad._id,
        sender: sanduni._id,
        senderName: 'Sanduni Perera',
        senderInitials: 'SP',
        text: "Thanks Tharushi! Attempting question 4 right now. Will ping questions regarding cycle detection in DAGs to the live Kuppiya!",
        kind: 'text',
        readBy: [sanduni._id, tharushi._id],
        createdAt: new Date(Date.now() - 4 * 60 * 1000),
      },
    ]);
  } else {
    await addParticipant(squad._id, userId);
  }

  const currentId = String(current._id);
  const tharushiId = String(tharushi._id);
  const kasunId = String(kasun._id);

  async function seedTutorThread(seedKey: string, student: { _id: unknown; name: string }, unread: boolean) {
    let tutorChat = await PodConversation.findOne({ seedKey });
    if (tutorChat) return tutorChat;
    const studentName = student.name;
    tutorChat = await PodConversation.create({
      seedKey,
      type: 'direct',
      category: 'tutor',
      title: 'Tharushi Perera',
      participants: [tharushi._id, student._id],
      createdBy: student._id,
      lastMessageText: 'Tharushi proposed a 15-min Edge Case Mock Run',
      lastMessageAt: new Date(Date.now() - 8 * 60 * 1000),
      lastSenderName: 'Tharushi Perera',
      unreadCounts: unread ? { [String(student._id)]: 1 } : {},
      meta: {
        leadName: 'Tharushi Perera',
        leadInitials: 'TP',
        subtitle: "Great L's List",
        actionLabel: 'ACTION',
        flashLabel: 'Flash Kuppiya · 15-min Edge Case',
        price: 'LKR 350',
        scheduleLabel: 'Tomorrow at 7:00 PM · 15 mins · Edge Case Mock Run',
        proposalStatus: 'pending',
        assessmentTitle: 'Assessment: Mid-Semester',
      },
    });
    await PodMessage.insertMany([
      {
        conversation: tutorChat._id,
        sender: student._id,
        senderName: studentName,
        senderInitials: initials(studentName),
        text: 'Hi Akki! I was reviewing the BFS shortest path practice problem from yesterday’s slides, but I got stuck on how the visited set is tracked when weights are uniform.',
        kind: 'text',
        readBy: [student._id],
        createdAt: new Date(Date.now() - 90 * 60 * 1000),
      },
      {
        conversation: tutorChat._id,
        sender: tharushi._id,
        senderName: 'Tharushi Perera',
        senderInitials: 'TP',
        text: `Hey ${studentName.split(' ')[0]}! Great question. For unweighted or uniform graphs, BFS naturally guarantees shortest paths because it explores level by level.`,
        kind: 'text',
        readBy: [tharushi._id],
        createdAt: new Date(Date.now() - 70 * 60 * 1000),
      },
      {
        conversation: tutorChat._id,
        sender: tharushi._id,
        senderName: 'Tharushi Perera',
        senderInitials: 'TP',
        text: 'Flash Kuppiya Proposed · LKR 350',
        kind: 'proposal',
        readBy: [tharushi._id],
        meta: { price: 'LKR 350', when: 'Tomorrow at 7:00 PM', detail: '15 mins · Edge Case Mock Run' },
        createdAt: new Date(Date.now() - 8 * 60 * 1000),
      },
    ]);
    return tutorChat;
  }

  await seedTutorThread('pod-tutor-tharushi-kasun', kasun, currentId === kasunId);
  if (current.role === 'student' && currentId !== kasunId && currentId !== tharushiId) {
    await seedTutorThread(`pod-tutor-${currentId}`, current, true);
  }

  let circle = await PodConversation.findOne({ seedKey: 'pod-stats-circle' });
  if (!circle) {
    circle = await PodConversation.create({
      seedKey: 'pod-stats-circle',
      type: 'group',
      category: 'circle',
      title: 'Stats Peer Circle',
      participants: uniquePeople.map((user) => user._id),
      createdBy: kasun._id,
      lastMessageText: 'Probability Distributions.pdf',
      lastMessageAt: new Date(Date.now() - 26 * 60 * 1000),
      lastSenderName: 'Kasun Jayawardena',
      unreadCounts: { [userId]: 0 },
      meta: {
        leadName: 'Kasun Jayawardena',
        leadInitials: 'KJ',
        memberCount: 9,
        subtitle: 'Kasun · Probability Distributions.pdf',
        moduleCode: 'MA2010',
      },
    });
    await PodMessage.create({
      conversation: circle._id,
      sender: kasun._id,
      senderName: 'Kasun Jayawardena',
      senderInitials: 'KJ',
      text: 'Uploaded Probability Distributions.pdf for tonight’s circle.',
      kind: 'file',
      readBy: [kasun._id],
    });
  } else {
    await addParticipant(circle._id, userId);
  }

  let flash = await PodConversation.findOne({ seedKey: 'pod-flash-kuppiya' });
  if (!flash) {
    flash = await PodConversation.create({
      seedKey: 'pod-flash-kuppiya',
      type: 'direct',
      category: 'kuppiya',
      title: 'Kasun Jayawardena',
      participants: uniquePeople.map((user) => user._id),
      createdBy: kasun._id,
      lastMessageText: 'Proposed: 30-Min Rapid Fire on Conditional Probability',
      lastMessageAt: new Date(Date.now() - 18 * 60 * 1000),
      lastSenderName: 'Kasun Jayawardena',
      unreadCounts: { [userId]: 1 },
      meta: {
        leadName: 'Kasun Jayawardena',
        leadInitials: 'KJ',
        subtitle: 'Flash Kuppiya Proposal',
        pollVotes: 6,
        isNew: false,
      },
    });
    await PodMessage.create({
      conversation: flash._id,
      sender: kasun._id,
      senderName: 'Kasun Jayawardena',
      senderInitials: 'KJ',
      text: 'Proposed: 30-Min Rapid Fire on Conditional Probability. Vote if you are in!',
      kind: 'text',
      readBy: [kasun._id],
      meta: { pollVotes: 6 },
      createdAt: new Date(Date.now() - 18 * 60 * 1000),
    });
  } else {
    await addParticipant(flash._id, userId);
  }

  const existingDirect = await ChatMessage.findOne({
    conversationKey: [String(tharushi._id), userId].sort().join(':'),
  });
  if (!existingDirect && String(tharushi._id) !== userId) {
    const key = [String(tharushi._id), userId].sort().join(':');
    await ChatMessage.create({
      conversationKey: key,
      sender: tharushi._id,
      receiver: userId,
      text: 'Ping me in Chat Pod if you want to join the Edge Case Mock Run.',
      read: false,
    });
  }
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
  }
}

export const seedPodData = memoizeSeed(seedPodDataOnce);

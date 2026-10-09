import User from '../models/User';
import Session from '../models/Session';
import {
  Assessment,
  ChatPodMessage,
  Discussion,
  LearningActivity,
  StudyGoal,
  StudyMaterial,
  StudyPlan,
  StudyWeek,
} from '../models/learning';
import { memoizeSeed } from './seedCache';

async function ensureTutor() {
  const email = 'tharushi.perera@unimentor.test';
  const existing = await User.findOne({ email });
  if (existing) return existing;
  return User.create({
    name: 'Tharushi Perera',
    email,
    password: 'Password123',
    role: 'mentor',
    subjects: ['Data Structures', 'Algorithms', 'Graph Theory'],
    bio: 'Senior student tutor for algorithms and discrete math.',
    rating: 4.9,
    reviewCount: 28,
  });
}

async function seedLearningDataOnce(studentId: string): Promise<void> {
  try {
  const alreadySeeded = await StudyWeek.exists({ studentId, seedKey: 'weekly-v1' });
  if (alreadySeeded) return;
  const tutor = await ensureTutor();

  await StudyWeek.create({
    studentId,
    seedKey: 'weekly-v1',
    sourcePage: 'plans',
    hoursGoal: 20,
    days: [
      { day: 'M', hours: 2 },
      { day: 'T', hours: 2.5 },
      { day: 'W', hours: 3 },
      { day: 'T', hours: 4 },
      { day: 'F', hours: 2 },
      { day: 'S', hours: 1 },
      { day: 'S', hours: 0 },
    ],
  });

  await StudyGoal.insertMany([
    {
      studentId,
      seedKey: 'goal-bfs',
      sourcePage: 'plans',
      title: 'Graph BFS Exercise',
      dueLabel: 'Due today',
      current: 2,
      total: 3,
      tag: '',
      completed: false,
    },
    {
      studentId,
      seedKey: 'goal-oop',
      sourcePage: 'plans',
      title: 'OOP Polymorphism Quiz',
      dueLabel: 'Midterm Prep',
      current: 0,
      total: 1,
      tag: '',
      completed: false,
    },
  ]);

  await LearningActivity.create({
    studentId,
    seedKey: 'activity-it2040',
    sourcePage: 'activity',
    moduleCode: 'IT2040',
    moduleName: 'Data Structures & Algorithms',
    topic: 'Graph Traversal (BFS & DFS)',
    activityType: 'Practice Questions',
    done: 6,
    total: 10,
    minutesLeft: 15,
  });

  await StudyPlan.insertMany([
    {
      studentId,
      seedKey: 'plan-dsa',
      sourcePage: 'plans',
      title: 'Graph Traversal week',
      moduleCode: 'IT2040',
      dueDate: new Date('2026-10-10T18:00:00.000Z'),
      status: 'active',
      progress: 60,
    },
    {
      studentId,
      seedKey: 'plan-prob',
      sourcePage: 'plans',
      title: 'Probability revision block',
      moduleCode: 'MA2010',
      dueDate: new Date('2026-10-18T04:30:00.000Z'),
      status: 'upcoming',
      progress: 20,
    },
  ]);

  await StudyMaterial.insertMany([
    {
      studentId,
      seedKey: 'mat-binary',
      sourcePage: 'materials',
      title: 'Binary Tree Revision Notes.pdf',
      kind: 'pdf',
      sourceLabel: 'DSA Revision Squad',
      sourceType: 'group',
      uploadedAt: new Date('2026-10-01T10:00:00.000Z'),
    },
    {
      studentId,
      seedKey: 'mat-graph',
      sourcePage: 'materials',
      title: 'Graph Algorithms Practice Set',
      kind: 'set',
      sourceLabel: 'Live Study Group',
      sourceType: 'session',
      uploadedAt: new Date('2026-10-01T16:00:00.000Z'),
    },
  ]);

  await Assessment.insertMany([
    {
      studentId,
      seedKey: 'asm-mock',
      sourcePage: 'assessments',
      type: 'exam',
      title: 'Mock Examination',
      subject: 'Probability & Statistics',
      scheduledAt: new Date('2026-10-18T04:30:00.000Z'),
      durationMin: 90,
      marks: 100,
      status: 'upcoming',
    },
    {
      studentId,
      seedKey: 'asm-tree',
      sourcePage: 'assessments',
      type: 'assignment',
      title: 'Assignment 2',
      subject: 'Programming Assignment: Tree Traversal',
      dueDate: new Date('2026-10-24T18:00:00.000Z'),
      status: 'open',
    },
  ]);

  await Discussion.insertMany([
    {
      studentId,
      seedKey: 'dis-dsa',
      sourcePage: 'discussions',
      title: 'DSA Revision Squad',
      group: 'DSA Revision Squad',
      authorName: 'Tharushi Perera',
      authorInitials: 'TP',
      preview: 'Voice note: Key hints on Dijkstra',
      votes: 0,
      joined: true,
      createdAt: new Date(Date.now() - 3 * 60 * 1000),
    },
    {
      studentId,
      seedKey: 'dis-flash',
      sourcePage: 'discussions',
      title: 'Flashcards Proposal',
      group: 'Probability Pod',
      authorName: 'Kasun Jayawardena',
      authorInitials: 'KJ',
      preview: '20 min rapid fire on Conditional Probability',
      votes: 6,
      joined: false,
      createdAt: new Date(Date.now() - 18 * 60 * 1000),
    },
  ]);

  await ChatPodMessage.insertMany([
    {
      studentId,
      seedKey: 'pod-1',
      sourcePage: 'chatPod',
      authorName: 'Tharushi Perera',
      authorInitials: 'TP',
      text: 'I dropped a voice note with Dijkstra hints. Check the squad thread.',
      unread: true,
      createdAt: new Date(Date.now() - 3 * 60 * 1000),
    },
    {
      studentId,
      seedKey: 'pod-2',
      sourcePage: 'chatPod',
      authorName: 'Kasun Jayawardena',
      authorInitials: 'KJ',
      text: 'Anyone joining the conditional probability rapid fire?',
      unread: true,
      createdAt: new Date(Date.now() - 18 * 60 * 1000),
    },
    {
      studentId,
      seedKey: 'pod-3',
      sourcePage: 'chatPod',
      authorName: 'Tharushi Perera',
      authorInitials: 'TP',
      text: 'Live tutoring on graph traversal starts now.',
      unread: true,
      createdAt: new Date(Date.now() - 35 * 60 * 1000),
    },
  ]);

  await Session.insertMany([
    {
      mentorId: tutor._id,
      studentId,
      subject: 'Graph Traversal',
      scheduledAt: new Date(),
      status: 'confirmed',
      notes: 'Live tutoring room',
      isLive: true,
      durationMin: 35,
      moduleCode: 'IT2040',
      sessionKind: 'tutoring',
      seedKey: 'live-graph',
    },
    {
      mentorId: tutor._id,
      studentId,
      subject: 'Probability',
      scheduledAt: new Date('2026-10-03T09:00:00.000Z'),
      status: 'confirmed',
      moduleCode: 'MA2010',
      durationMin: 60,
      sessionKind: 'tutoring',
      seedKey: 'up-prob',
    },
    {
      mentorId: tutor._id,
      studentId,
      subject: 'Tree Traversal workshop',
      scheduledAt: new Date('2026-10-05T13:00:00.000Z'),
      status: 'pending',
      moduleCode: 'IT2040',
      durationMin: 45,
      sessionKind: 'tutoring',
      seedKey: 'up-tree',
    },
    {
      mentorId: tutor._id,
      studentId,
      subject: 'OOP Polymorphism clinic',
      scheduledAt: new Date('2026-10-07T11:00:00.000Z'),
      status: 'pending',
      moduleCode: 'IT2020',
      durationMin: 40,
      sessionKind: 'tutoring',
      seedKey: 'up-oop',
    },
    {
      mentorId: tutor._id,
      studentId,
      subject: 'Exam prep: Dijkstra',
      scheduledAt: new Date('2026-10-09T15:00:00.000Z'),
      status: 'pending',
      moduleCode: 'IT2040',
      durationMin: 50,
      sessionKind: 'tutoring',
      seedKey: 'up-dijkstra',
    },
  ]);
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
  }
}

export const seedLearningData = memoizeSeed(seedLearningDataOnce);

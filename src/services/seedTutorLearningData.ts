import User from '../models/User';
import { TutorPack, TutorStudent, TutorWorkspace } from '../models/tutorLearning';

type SeedStudent = {
  seedKey: string;
  name: string;
  initials: string;
  studentCode: string;
  year: number;
  programme: string;
  moduleCode: string;
  status: 'review' | 'graded' | 'atRisk';
  priority: number;
  workTitle: string;
  taskLabel?: string;
  questionCount?: number;
  pdfReady?: boolean;
  score?: number;
  packsDownloaded: number;
  classRank?: number;
  midtermPercent?: number;
  feedbackSent?: boolean;
  submittedAgoMin?: number;
  gradedAgoMin?: number;
  email?: string;
};

const roster: SeedStudent[] = [
  {
    seedKey: 'diniti',
    name: 'Diniti Alwis',
    initials: 'DA',
    studentCode: 'IT2040-92',
    year: 2,
    programme: 'Computer Science',
    moduleCode: 'IT2040',
    status: 'review',
    priority: 1,
    workTitle: 'Graph BFS/DFS Practice Test',
    taskLabel: 'Mid-Term Mock #02',
    questionCount: 12,
    pdfReady: true,
    packsDownloaded: 4,
    submittedAgoMin: 120,
    email: 'diniti.alwis@unimentor.test',
  },
  {
    seedKey: 'charuka',
    name: 'Charuka Perera',
    initials: 'CP',
    studentCode: 'SE3011-18',
    year: 3,
    programme: 'Software Engineering',
    moduleCode: 'IT2040',
    status: 'graded',
    priority: 2,
    workTitle: 'Binary Trees & AVL Balancing',
    score: 88,
    packsDownloaded: 12,
    classRank: 3,
    feedbackSent: true,
    gradedAgoMin: 15,
    email: 'charuka.perera@unimentor.test',
  },
  {
    seedKey: 'kasun',
    name: 'Kasun Jayawardena',
    initials: 'KJ',
    studentCode: 'IS2204-07',
    year: 3,
    programme: 'Information Systems',
    moduleCode: 'MA2010',
    status: 'atRisk',
    priority: 1,
    workTitle: 'Mid-Term: Conditional Probability',
    midtermPercent: 42,
    packsDownloaded: 3,
    email: 'kasun.jayawardena@unimentor.test',
  },
  { seedKey: 'nimali', name: 'Nimali Fernando', initials: 'NF', studentCode: 'IT2040-11', year: 2, programme: 'Computer Science', moduleCode: 'IT2040', status: 'review', priority: 2, workTitle: 'DFS Recursion Worksheet', questionCount: 8, pdfReady: true, packsDownloaded: 2, submittedAgoMin: 240 },
  { seedKey: 'ayesha', name: 'Ayesha Perera', initials: 'AP', studentCode: 'IT2020-44', year: 2, programme: 'Computer Science', moduleCode: 'IT2020', status: 'review', priority: 3, workTitle: 'OOP Polymorphism Quiz', questionCount: 10, pdfReady: true, packsDownloaded: 5, submittedAgoMin: 300 },
  { seedKey: 'ruwan', name: 'Ruwan Silva', initials: 'RS', studentCode: 'IT2040-21', year: 2, programme: 'Software Engineering', moduleCode: 'IT2040', status: 'review', priority: 3, workTitle: 'Dijkstra Shortest Path Set', questionCount: 6, pdfReady: true, packsDownloaded: 1, submittedAgoMin: 400 },
  { seedKey: 'ishara', name: 'Ishara Jayasuriya', initials: 'IJ', studentCode: 'IT2040-33', year: 3, programme: 'Computer Science', moduleCode: 'IT2040', status: 'review', priority: 4, workTitle: 'Tree Traversal Lab', questionCount: 9, pdfReady: false, packsDownloaded: 6, submittedAgoMin: 500 },
  { seedKey: 'thilina', name: 'Thilina Bandara', initials: 'TB', studentCode: 'SE3011-09', year: 3, programme: 'Software Engineering', moduleCode: 'IT2040', status: 'review', priority: 4, workTitle: 'Heap Operations Drill', questionCount: 7, pdfReady: true, packsDownloaded: 3, submittedAgoMin: 560 },
  { seedKey: 'menaka', name: 'Menaka Wijesinghe', initials: 'MW', studentCode: 'IS2204-12', year: 3, programme: 'Information Systems', moduleCode: 'MA2010', status: 'atRisk', priority: 2, workTitle: 'Probability Recovery Check', midtermPercent: 51, packsDownloaded: 2 },
  { seedKey: 'dilshan', name: 'Dilshan Fernando', initials: 'DF', studentCode: 'IT2040-08', year: 2, programme: 'Computer Science', moduleCode: 'IT2040', status: 'graded', priority: 5, workTitle: 'BFS Practice Set', score: 91, packsDownloaded: 8, classRank: 2, feedbackSent: true, gradedAgoMin: 80 },
  { seedKey: 'sahan', name: 'Sahan Perera', initials: 'SP', studentCode: 'IT2020-19', year: 2, programme: 'Computer Science', moduleCode: 'IT2020', status: 'graded', priority: 5, workTitle: 'Inheritance Mini Test', score: 76, packsDownloaded: 7, classRank: 9, feedbackSent: true, gradedAgoMin: 120 },
  { seedKey: 'kavindi', name: 'Kavindi Rathnayake', initials: 'KR', studentCode: 'IT2040-41', year: 2, programme: 'Computer Science', moduleCode: 'IT2040', status: 'graded', priority: 6, workTitle: 'Graph Colouring Notes Quiz', score: 84, packsDownloaded: 9, classRank: 5, feedbackSent: true, gradedAgoMin: 200 },
  { seedKey: 'amaya', name: 'Amaya Senanayake', initials: 'AS', studentCode: 'SE3011-22', year: 3, programme: 'Software Engineering', moduleCode: 'IT2040', status: 'graded', priority: 6, workTitle: 'AVL Rotation Workshop', score: 80, packsDownloaded: 11, classRank: 6, feedbackSent: true, gradedAgoMin: 260 },
  { seedKey: 'pasindu', name: 'Pasindu Gunasekara', initials: 'PG', studentCode: 'IT2040-55', year: 2, programme: 'Computer Science', moduleCode: 'IT2040', status: 'graded', priority: 7, workTitle: 'Adjacency List Lab', score: 73, packsDownloaded: 4, classRank: 11, feedbackSent: true, gradedAgoMin: 400 },
  { seedKey: 'harini', name: 'Harini de Silva', initials: 'HD', studentCode: 'IT2020-03', year: 2, programme: 'Computer Science', moduleCode: 'IT2020', status: 'graded', priority: 7, workTitle: 'Interface Design Quiz', score: 95, packsDownloaded: 10, classRank: 1, feedbackSent: true, gradedAgoMin: 500 },
  { seedKey: 'malith', name: 'Malith Weerasinghe', initials: 'MW2', studentCode: 'SE3011-31', year: 3, programme: 'Software Engineering', moduleCode: 'IT2040', status: 'graded', priority: 8, workTitle: 'Hashing Review', score: 69, packsDownloaded: 5, classRank: 14, feedbackSent: true, gradedAgoMin: 620 },
  { seedKey: 'dinuka', name: 'Dinuka Jayawardena', initials: 'DJ', studentCode: 'IS2204-16', year: 3, programme: 'Information Systems', moduleCode: 'MA2010', status: 'graded', priority: 8, workTitle: 'Bayes Theorem Set', score: 82, packsDownloaded: 6, classRank: 7, feedbackSent: true, gradedAgoMin: 700 },
  { seedKey: 'sanduni', name: 'Sanduni Perera', initials: 'SP2', studentCode: 'IT2040-60', year: 2, programme: 'Computer Science', moduleCode: 'IT2040', status: 'graded', priority: 9, workTitle: 'Cycle Detection Drill', score: 77, packsDownloaded: 8, classRank: 8, feedbackSent: true, gradedAgoMin: 800 },
];

async function ensureStudentUser(name: string, email: string) {
  const existing = await User.findOne({ email });
  if (existing) return existing;
  return User.create({
    name,
    email,
    password: 'Password123',
    role: 'student',
    subjects: ['Data Structures', 'Algorithms'],
    bio: 'UniMentor enrolled student.',
  });
}

export async function seedTutorLearningData(tutorId: string): Promise<void> {
  const existing = await TutorWorkspace.findOne({ tutorId, seedKey: 'workspace-v1' });
  if (existing) return;

  await TutorWorkspace.create({
    tutorId,
    seedKey: 'workspace-v1',
    sourcePage: 'workspace',
    cohort: 'DSA & OOP',
    assignedPacks: 24,
    classMastery: 78.4,
    masteryDelta: 4.2,
    plagiarismFlags: 0,
  });

  for (const row of roster) {
    const user = row.email ? await ensureStudentUser(row.name, row.email) : undefined;
    await TutorStudent.create({
      tutorId,
      studentUserId: user?._id,
      seedKey: row.seedKey,
      sourcePage: 'students',
      name: row.name,
      initials: row.initials,
      studentCode: row.studentCode,
      year: row.year,
      programme: row.programme,
      moduleCode: row.moduleCode,
      status: row.status,
      priority: row.priority,
      workTitle: row.workTitle,
      taskLabel: row.taskLabel,
      questionCount: row.questionCount,
      pdfReady: row.pdfReady ?? false,
      score: row.score,
      maxScore: 100,
      packsDownloaded: row.packsDownloaded,
      classRank: row.classRank,
      midtermPercent: row.midtermPercent,
      feedbackSent: row.feedbackSent ?? false,
      submittedAt: row.submittedAgoMin ? new Date(Date.now() - row.submittedAgoMin * 60 * 1000) : undefined,
      gradedAt: row.gradedAgoMin ? new Date(Date.now() - row.gradedAgoMin * 60 * 1000) : undefined,
    });
  }

  await TutorPack.insertMany([
    { tutorId, seedKey: 'pack-mock', sourcePage: 'packs', title: 'Batch Assign Mock', kind: 'mock', assignedCount: 4 },
    { tutorId, seedKey: 'pack-study', sourcePage: 'packs', title: 'Push Study Pack', kind: 'study', assignedCount: 18 },
    { tutorId, seedKey: 'pack-recovery', sourcePage: 'packs', title: 'Recovery Pack', kind: 'recovery', assignedCount: 2 },
  ]);
}

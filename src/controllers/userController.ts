import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import User, { IEnrolledModule } from '../models/User';
import UserDocument, { DocumentKind } from '../models/UserDocument';
import { AuthRequest } from '../middleware/auth';
import { seedLearningData } from '../services/seedLearningData';

function mapMentor(mentor: { _id: unknown; name: string; bio?: string; subjects?: string[]; rating?: number; reviewCount?: number; profilePicture?: string }) {
  return {
    id: String(mentor._id),
    name: mentor.name,
    roleTitle: 'Peer Mentor',
    batch: "Batch '24",
    rating: mentor.rating ?? 4.8,
    reviewCount: mentor.reviewCount ?? 0,
    avatar: mentor.profilePicture,
    isVerified: true,
    activeStudentsCount: 18,
    subjects: mentor.subjects ?? [],
    bio: mentor.bio ?? '',
    hourlyRate: 2000,
  };
}

const DEFAULT_ENROLLED_MODULES: IEnrolledModule[] = [
  {
    code: 'IT2040',
    name: 'Data Structures: Graph Traversals & Algorithms',
    credits: 4,
    faculty: 'Computing',
    department: 'Software Engineering',
    progress: 75,
    status: 'active',
    nextSession: 'Today, 2:30 PM • Live Peer Revision',
    mentor: {
      id: 'mentor-tharushi-1',
      name: 'Tharushi Perera',
      roleTitle: 'Senior Peer Mentor',
      batch: "Batch '24",
      rating: 4.9,
      reviewCount: 38,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      isVerified: true,
      activeStudentsCount: 24,
      hourlyRate: 2500,
    },
  },
  {
    code: 'SE3020',
    name: 'Software Architecture & Enterprise Design',
    credits: 4,
    faculty: 'Computing',
    department: 'Software Engineering',
    progress: 60,
    status: 'active',
    nextSession: 'Tomorrow, 10:00 AM • Microservices Q&A',
    mentor: {
      id: 'mentor-kaveen-2',
      name: 'Kaveen De Silva',
      roleTitle: 'Lead Peer Mentor',
      batch: "Batch '23",
      rating: 4.8,
      reviewCount: 29,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
      isVerified: true,
      activeStudentsCount: 19,
      hourlyRate: 1800,
    },
  },
  {
    code: 'IT2030',
    name: 'Database Management Systems & Big Data',
    credits: 3,
    faculty: 'Computing',
    department: 'Information Technology',
    progress: 85,
    status: 'active',
    nextSession: 'Friday, 3:00 PM • Query Optimization',
    mentor: {
      id: 'mentor-sanduni-3',
      name: 'Sanduni Fernando',
      roleTitle: 'Peer Tutor',
      batch: "Batch '24",
      rating: 4.95,
      reviewCount: 44,
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
      isVerified: true,
      activeStudentsCount: 31,
      hourlyRate: 2200,
    },
  },
  {
    code: 'MA2010',
    name: 'Probability & Statistics for Computing',
    credits: 3,
    faculty: 'Humanities & Sciences',
    department: 'Mathematics & Statistics',
    progress: 45,
    status: 'active',
    nextSession: 'Saturday, 11:00 AM • Mock Exam Prep',
    mentor: {
      id: 'mentor-asanka-4',
      name: 'Dr. Asanka Perera',
      roleTitle: 'Faculty Academic Mentor',
      batch: 'Faculty Advisor',
      rating: 5.0,
      reviewCount: 52,
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
      isVerified: true,
      activeStudentsCount: 42,
      hourlyRate: 4500,
    },
  },
];

export async function getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.userId).select('-password -idPhoto -referenceFaceImage -loginCode -loginCodeExpires -passwordResetCode -passwordResetExpires');
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const allowedFields = [
      'name', 'bio', 'profilePicture', 'subjects', 'degreeProgramme', 'academicYear', 'semester',
      'hourlyRate', 'availability', 'university', 'faculty', 'department', 'studentId', 'phone',
    ];
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (updates.hourlyRate !== undefined) {
      const rate = Number(updates.hourlyRate);
      if (!Number.isFinite(rate) || rate < 0 || rate > 20000) {
        res.status(400).json({ message: 'Hourly rate must be between 0 and 20,000 LKR.' });
        return;
      }
      updates.hourlyRate = rate;
    }

    const user = await User.findByIdAndUpdate(req.userId, updates, {
      new: true,
      runValidators: true,
    }).select('-password -idPhoto -referenceFaceImage -loginCode -loginCodeExpires -passwordResetCode -passwordResetExpires');

    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function getStudentDashboard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.userRole === 'student') {
      await seedLearningData(String(req.userId));
    }
    const user = await User.findById(req.userId).select('-password -idPhoto -referenceFaceImage -loginCode -loginCodeExpires -passwordResetCode -passwordResetExpires');
    if (!user) {
      res.status(404).json({ message: 'Student account not found.' });
      return;
    }

    let isModified = false;

    if (!user.enrolledModules || user.enrolledModules.length === 0) {
      user.enrolledModules = DEFAULT_ENROLLED_MODULES;
      isModified = true;
    }

    if (!user.academicStats) {
      user.academicStats = {
        goals: 4,
        plans: 3,
        dueTests: 2,
        done: 18,
      };
      isModified = true;
    }

    if (!user.degreeProgramme) {
      user.degreeProgramme = 'BSc (Hons) Software Engineering';
      isModified = true;
    }
    if (!user.academicYear) {
      user.academicYear = 'Year 3';
      isModified = true;
    }
    if (!user.semester) {
      user.semester = 'Sem 2';
      isModified = true;
    }

    if (isModified) {
      await user.save();
    }

    // Fetch real mentors from database to offer for selection or assignment
    const dbMentors = await User.find({ role: 'mentor' })
      .select('name email subjects rating reviewCount profilePicture bio hourlyRate experience sessionCount availability')
      .limit(10);

    const availableMentors = dbMentors.map((m) => ({
      id: String(m._id),
      name: m.name,
      roleTitle: m.experience || 'Senior Peer Mentor',
      batch: "Batch '24",
      rating: m.rating || 4.9,
      reviewCount: m.reviewCount || 25,
      avatar: m.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=0D4F9E&color=fff`,
      subjects: m.subjects || [],
      isVerified: true,
      activeStudentsCount: m.sessionCount || 20 + Math.floor(Math.random() * 15),
      hourlyRate: m.hourlyRate || 1800,
    }));

    const deadlineAlert = {
      id: 'alert-prob-stat',
      tag: 'DEADLINE APPROACHING • 2 DAYS LEFT',
      title: 'Mock Exam: Probability & Statist',
      moduleCode: 'MA2010',
      daysLeft: 2,
      reviewAction: 'Review Mock Exam',
      tutorAction: 'Find Tutor',
      tutorQuery: 'Probability',
    };

    const liveSession = {
      id: 'live-ds-1',
      tag: 'LIVE NOW',
      timeRemaining: '35m left',
      title: 'Data Structures: Graph Traversals',
      moduleCode: 'IT2040',
      sessionType: 'Peer Revision',
      subtitle: 'Module Code: IT2040 • Peer Revision',
      activeParticipants: 24,
      mentor: {
        id: 'mentor-tharushi-1',
        name: 'Tharushi Perera',
        roleTitle: 'Senior Peer Mentor',
        batch: "Batch '24",
        activeCount: 24,
        isVerified: true,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      },
      roomAction: 'Join Room',
    };

    const quickLaunchpad = [
      { key: 'goal', label: 'New Goal', icon: 'check-circle-plus', isHighlighted: true },
      { key: 'pods', label: 'Pods', icon: 'chat-bubble', badge: '3' },
      { key: 'session', label: 'Join session', icon: 'video' },
      { key: 'library', label: 'Library', icon: 'book-open' },
    ];

    res.json({
      user: {
        _id: user._id,
        name: user.name || 'Nethmi Silva',
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
        degreeProgramme: user.degreeProgramme,
        academicYear: user.academicYear,
        semester: user.semester,
      },
      academicStats: user.academicStats,
      deadlineAlert,
      quickLaunchpad,
      liveSession,
      enrolledModules: user.enrolledModules,
      availableMentors,
    });
  } catch (err) {
    next(err);
  }
}

export async function registerModule(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { code, name, credits, faculty, department, mentor } = req.body;

    if (!code || !name) {
      res.status(400).json({ message: 'Module code and name are required.' });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    if (!user.enrolledModules) {
      user.enrolledModules = [];
    }

    const exists = user.enrolledModules.some((m) => m.code.toUpperCase() === code.toUpperCase());
    if (exists) {
      res.status(400).json({ message: `Module ${code} is already registered.` });
      return;
    }

    const newModule: IEnrolledModule = {
      code: code.toUpperCase(),
      name,
      credits: credits || 3,
      faculty,
      department,
      progress: 0,
      status: 'active',
      nextSession: 'Upcoming • Schedule available soon',
      mentor: mentor || {
        id: 'mentor-general',
        name: 'Assigned Peer Mentor',
        roleTitle: 'Peer Mentor',
        batch: "Batch '24",
        rating: 4.85,
        reviewCount: 20,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        isVerified: true,
        activeStudentsCount: 16,
      },
    };

    user.enrolledModules.push(newModule);
    await user.save();

    res.status(201).json({
      message: 'Module successfully registered!',
      enrolledModules: user.enrolledModules,
    });
  } catch (err) {
    next(err);
  }
}

export async function assignMentorToModule(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { code } = req.params;
    const { mentor } = req.body;

    if (!mentor || !mentor.name) {
      res.status(400).json({ message: 'Mentor details are required.' });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    const targetModule = user.enrolledModules?.find(
      (m) => m.code.toUpperCase() === code.toUpperCase()
    );

    if (!targetModule) {
      res.status(404).json({ message: `Registered module ${code} not found.` });
      return;
    }

    targetModule.mentor = {
      id: mentor.id,
      name: mentor.name,
      roleTitle: mentor.roleTitle || 'Senior Peer Mentor',
      batch: mentor.batch || "Batch '24",
      rating: mentor.rating || 4.9,
      reviewCount: mentor.reviewCount || 25,
      avatar: mentor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(mentor.name)}`,
      isVerified: mentor.isVerified ?? true,
      activeStudentsCount: mentor.activeStudentsCount || 20,
    };

    await user.save();

    res.json({
      message: 'Mentor assigned successfully!',
      enrolledModules: user.enrolledModules,
    });
  } catch (err) {
    next(err);
  }
}

export async function dropModule(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { code } = req.params;
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    user.enrolledModules = (user.enrolledModules || []).filter(
      (m) => m.code.toUpperCase() !== code.toUpperCase()
    );

    await user.save();

    res.json({
      message: `Module ${code} dropped.`,
      enrolledModules: user.enrolledModules,
    });
  } catch (err) {
    next(err);
  }
}

export async function addStudentGoal(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    if (!user.academicStats) {
      user.academicStats = { goals: 4, plans: 3, dueTests: 2, done: 18 };
    }

    user.academicStats.goals = (user.academicStats.goals || 0) + 1;
    await user.save();

    res.json({
      message: 'Goal added!',
      academicStats: user.academicStats,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateModuleProgress(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { code } = req.params;
    const { progress, nextSession } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    const mod = user.enrolledModules?.find(
      (m) => m.code.toUpperCase() === code.toUpperCase()
    );

    if (!mod) {
      res.status(404).json({ message: `Module ${code} not found.` });
      return;
    }

    if (progress !== undefined) {
      mod.progress = Math.min(100, Math.max(0, Number(progress)));
    }
    if (nextSession !== undefined) {
      mod.nextSession = String(nextSession);
    }

    await user.save();
    res.json({
      message: 'Module updated!',
      enrolledModules: user.enrolledModules,
    });
  } catch (err) {
    next(err);
  }
}

export async function removeSubjectOrInterest(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { subject } = req.params;
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    user.subjects = (user.subjects || []).filter(
      (s) => s.toLowerCase() !== decodeURIComponent(subject).toLowerCase()
    );

    await user.save();
    res.json({
      message: 'Subject removed.',
      subjects: user.subjects,
    });
  } catch (err) {
    next(err);
  }
}

export async function getShortlist(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }
    res.json(user.shortlistedMentors || []);
  } catch (err) {
    next(err);
  }
}

export async function addToShortlist(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { mentorId, name, avatar, hourlyRate, rating, subjects, priority, notes } = req.body;
    if (!mentorId || !name) {
      res.status(400).json({ message: 'mentorId and name are required.' });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    user.shortlistedMentors = user.shortlistedMentors || [];
    const existingIndex = user.shortlistedMentors.findIndex((m) => m.mentorId === mentorId);

    if (existingIndex > -1) {
      user.shortlistedMentors[existingIndex].priority = priority || user.shortlistedMentors[existingIndex].priority;
      user.shortlistedMentors[existingIndex].notes = notes !== undefined ? notes : user.shortlistedMentors[existingIndex].notes;
    } else {
      user.shortlistedMentors.push({
        mentorId,
        name,
        avatar,
        hourlyRate: Number(hourlyRate) || 2000,
        rating: Number(rating) || 4.8,
        subjects: Array.isArray(subjects) ? subjects : [],
        priority: priority || 'Considering',
        notes: notes || '',
        savedAt: new Date(),
      });
    }

    await user.save();
    res.status(201).json({
      message: 'Tutor saved to shortlist.',
      shortlist: user.shortlistedMentors,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateShortlist(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { mentorId } = req.params;
    const { priority, notes } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    user.shortlistedMentors = user.shortlistedMentors || [];
    const item = user.shortlistedMentors.find((m) => m.mentorId === mentorId);
    if (!item) {
      res.status(404).json({ message: 'Shortlisted tutor not found.' });
      return;
    }

    if (priority) item.priority = priority;
    if (notes !== undefined) item.notes = notes;

    await user.save();
    res.json({
      message: 'Shortlist entry updated.',
      shortlist: user.shortlistedMentors,
    });
  } catch (err) {
    next(err);
  }
}

export async function removeFromShortlist(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { mentorId } = req.params;
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    user.shortlistedMentors = (user.shortlistedMentors || []).filter((m) => m.mentorId !== mentorId);
    await user.save();
    res.json({
      message: 'Tutor removed from shortlist.',
      shortlist: user.shortlistedMentors,
    });
  } catch (err) {
    next(err);
  }
}

function assertStaff(req: AuthRequest, res: Response): boolean {
  if (req.userRole !== 'admin' && req.userRole !== 'lic') {
    res.status(403).json({ message: 'Staff access is required.' });
    return false;
  }
  return true;
}

export async function listDirectory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!assertStaff(req, res)) return;
    const users = await User.find()
      .select('name email role verificationStatus accountStatus isVerified university faculty department studentId degreeProgramme subjects hourlyRate phone createdAt')
      .sort({ createdAt: -1 })
      .limit(300);
    res.json({ users });
  } catch (err) {
    next(err);
  }
}

export async function setAccountStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!assertStaff(req, res)) return;
    const allowed = ['active', 'pending', 'under_review', 'suspended', 'rejected', 'expired'];
    if (!allowed.includes(req.body.accountStatus)) {
      res.status(400).json({ message: 'Unknown account status.' });
      return;
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { accountStatus: req.body.accountStatus },
      { new: true },
    ).select('name email role accountStatus verificationStatus');
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function setVerificationStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!assertStaff(req, res)) return;
    const allowed = ['unverified', 'pending', 'under_review', 'verified', 'approved', 'rejected'];
    if (!allowed.includes(req.body.verificationStatus)) {
      res.status(400).json({ message: 'Unknown verification status.' });
      return;
    }
    const approved = req.body.verificationStatus === 'approved' || req.body.verificationStatus === 'verified';
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        verificationStatus: req.body.verificationStatus,
        accountStatus: approved ? 'active' : req.body.verificationStatus === 'rejected' ? 'rejected' : 'under_review',
        isVerified: approved,
      },
      { new: true },
    ).select('name email role accountStatus verificationStatus isVerified');
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

const DOCUMENT_KINDS: DocumentKind[] = ['front', 'back', 'transcript'];

function isDocumentKind(value: unknown): value is DocumentKind {
  return DOCUMENT_KINDS.includes(value as DocumentKind);
}

const NOTIFICATION_DEFAULTS = {
  sessionReminders: true,
  chatMessages: true,
  bookingUpdates: true,
  verificationAlerts: true,
  semesterRenewals: true,
  facultyNews: false,
};

export async function saveDocument(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const kind = req.body.kind;
    const image = String(req.body.image || '');
    if (!isDocumentKind(kind) || !image.startsWith('data:image/')) {
      res.status(400).json({ message: 'Upload a photo of the document.' });
      return;
    }
    if (image.length > 8_000_000) {
      res.status(400).json({ message: 'That photo is too large. Try a smaller image.' });
      return;
    }
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }
    const fileName = String(req.body.fileName || `${kind}.jpg`).replace(/[^\w.\- ]/g, '').slice(0, 80) || `${kind}.jpg`;
    const saved = await UserDocument.findOneAndUpdate(
      { userId: user._id, kind },
      { image, fileName, status: 'pending' },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    if (kind === 'front') user.idPhoto = image;
    await user.save();
    res.json({ kind: saved?.kind ?? kind, fileName: saved?.fileName ?? fileName, status: saved?.status ?? 'pending' });
  } catch (err) {
    next(err);
  }
}

export async function getDocuments(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({ message: 'Unknown user.' });
      return;
    }
    const staff = req.userRole === 'admin' || req.userRole === 'lic';
    const self = String(req.userId) === String(req.params.id);
    if (!staff && !self) {
      res.status(403).json({ message: 'Staff access is required.' });
      return;
    }
    const user = await User.findById(req.params.id).select('name email studentId university faculty degreeProgramme verificationStatus hourlyRate createdAt');
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }
    const full = req.query.full === '1';
    const docs = await UserDocument.find({ userId: user._id }).select(full ? 'kind image fileName status' : 'kind fileName status');
    res.json({
      user,
      documents: docs.map((doc) => ({
        kind: doc.kind,
        fileName: doc.fileName,
        status: doc.status,
        ...(full ? { image: doc.image } : {}),
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function reviewDocument(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!assertStaff(req, res)) return;
    if (!mongoose.isValidObjectId(req.params.id) || !isDocumentKind(req.params.kind)) {
      res.status(400).json({ message: 'Unknown document.' });
      return;
    }
    if (req.body.status !== 'approved' && req.body.status !== 'reupload') {
      res.status(400).json({ message: 'Choose approve or re-upload.' });
      return;
    }
    const doc = await UserDocument.findOneAndUpdate(
      { userId: req.params.id, kind: req.params.kind },
      { status: req.body.status },
      { new: true },
    );
    if (!doc) {
      res.status(404).json({ message: 'No upload for this document yet.' });
      return;
    }
    res.json({ kind: doc.kind, status: doc.status });
  } catch (err) {
    next(err);
  }
}

export async function getSecuritySettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.userId).select('twoFactorEnabled biometricEnabled');
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }
    res.json({ twoFactorEnabled: !!user.twoFactorEnabled, biometricEnabled: !!user.biometricEnabled });
  } catch (err) {
    next(err);
  }
}

export async function updateSecuritySettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }
    if (typeof req.body.twoFactorEnabled === 'boolean') user.twoFactorEnabled = req.body.twoFactorEnabled;
    if (typeof req.body.biometricEnabled === 'boolean') user.biometricEnabled = req.body.biometricEnabled;
    await user.save();
    res.json({ twoFactorEnabled: !!user.twoFactorEnabled, biometricEnabled: !!user.biometricEnabled });
  } catch (err) {
    next(err);
  }
}

export async function getNotificationSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.userId).select('notificationPrefs');
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }
    const prefs = { ...NOTIFICATION_DEFAULTS };
    (Object.keys(NOTIFICATION_DEFAULTS) as (keyof typeof NOTIFICATION_DEFAULTS)[]).forEach((key) => {
      const stored = user.notificationPrefs?.[key];
      if (typeof stored === 'boolean') prefs[key] = stored;
    });
    res.json(prefs);
  } catch (err) {
    next(err);
  }
}

export async function updateNotificationSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }
    const current = { ...NOTIFICATION_DEFAULTS };
    (Object.keys(NOTIFICATION_DEFAULTS) as (keyof typeof NOTIFICATION_DEFAULTS)[]).forEach((key) => {
      const stored = user.notificationPrefs?.[key];
      if (typeof stored === 'boolean') current[key] = stored;
      if (typeof req.body[key] === 'boolean') current[key] = req.body[key];
    });
    user.notificationPrefs = current;
    user.markModified('notificationPrefs');
    await user.save();
    res.json(current);
  } catch (err) {
    next(err);
  }
}


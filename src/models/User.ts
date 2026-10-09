import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IEnrolledModule {
  code: string;
  name: string;
  credits?: number;
  faculty?: string;
  department?: string;
  progress?: number;
  status?: string;
  nextSession?: string;
  mentor?: {
    id?: string;
    name: string;
    roleTitle?: string;
    batch?: string;
    rating?: number;
    reviewCount?: number;
    avatar?: string;
    isVerified?: boolean;
    activeStudentsCount?: number;
    hourlyRate?: number;
  };
}

export interface IShortlistedMentor {
  mentorId: string;
  name: string;
  avatar?: string;
  hourlyRate: number;
  rating: number;
  subjects: string[];
  priority: 'Top Choice' | 'Considering' | 'Backup';
  notes?: string;
  savedAt: Date;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'student' | 'mentor' | 'admin' | 'lic';
  profilePicture?: string;
  bio?: string;
  subjects?: string[];
  degreeProgramme?: string;
  academicYear?: string;
  semester?: string;
  academicStats?: {
    goals: number;
    plans: number;
    dueTests: number;
    done: number;
  };
  enrolledModules?: IEnrolledModule[];
  shortlistedMentors?: IShortlistedMentor[];
  rating?: number;
  reviewCount?: number;
  hourlyRate?: number;
  experience?: string;
  sessionCount?: number;
  availability?: string;
  qualification?: string;
  languages?: string[];
  teachingMode?: string;
  lessonTypes?: string[];
  campusId?: mongoose.Types.ObjectId;
  university?: string;
  faculty?: string;
  department?: string;
  studentId?: string;
  phone?: string;
  accountStatus?: 'active' | 'pending' | 'under_review' | 'suspended' | 'rejected' | 'expired';
  isVerified?: boolean;
  verificationStatus?: 'unverified' | 'pending' | 'under_review' | 'verified' | 'approved' | 'rejected';
  faceVerifiedAt?: Date;
  idPhoto?: string;
  referenceFaceImage?: string;
  passwordResetCode?: string;
  passwordResetExpires?: Date;
  passwordResetVerified?: boolean;
  loginCode?: string;
  loginCodeExpires?: Date;
  tokenVersion?: number;
  twoFactorEnabled?: boolean;
  biometricEnabled?: boolean;
  notificationPrefs?: {
    sessionReminders: boolean;
    chatMessages: boolean;
    bookingUpdates: boolean;
    verificationAlerts: boolean;
    semesterRenewals: boolean;
    facultyNews: boolean;
  };
  createdAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const enrolledModuleSchema = new Schema<IEnrolledModule>(
  {
    code: { type: String, required: true },
    name: { type: String, required: true },
    credits: { type: Number, default: 3 },
    faculty: { type: String },
    department: { type: String },
    progress: { type: Number, default: 50 },
    status: { type: String, default: 'active' },
    nextSession: { type: String },
    mentor: {
      id: { type: String },
      name: { type: String, default: 'Unassigned Mentor' },
      roleTitle: { type: String, default: 'Peer Mentor' },
      batch: { type: String, default: "Batch '24" },
      rating: { type: Number, default: 4.8 },
      reviewCount: { type: Number, default: 20 },
      avatar: { type: String },
      isVerified: { type: Boolean, default: true },
      activeStudentsCount: { type: Number, default: 15 },
      hourlyRate: { type: Number, default: 1800 },
    },
  },
  { _id: false }
);

const shortlistedMentorSchema = new Schema<IShortlistedMentor>(
  {
    mentorId: { type: String, required: true },
    name: { type: String, required: true },
    avatar: { type: String },
    hourlyRate: { type: Number, default: 2000 },
    rating: { type: Number, default: 4.8 },
    subjects: [{ type: String }],
    priority: { type: String, enum: ['Top Choice', 'Considering', 'Backup'], default: 'Considering' },
    notes: { type: String, default: '' },
    savedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ['student', 'mentor', 'admin', 'lic'], required: true },
    profilePicture: { type: String },
    bio: { type: String },
    subjects: [{ type: String }],
    degreeProgramme: { type: String, default: 'BSc (Hons) Software Engineering' },
    academicYear: { type: String, default: 'Year 3' },
    semester: { type: String, default: 'Sem 2' },
    academicStats: {
      goals: { type: Number, default: 4 },
      plans: { type: Number, default: 3 },
      dueTests: { type: Number, default: 2 },
      done: { type: Number, default: 18 },
    },
    enrolledModules: [enrolledModuleSchema],
    shortlistedMentors: [shortlistedMentorSchema],
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    hourlyRate: { type: Number, default: 1800 },
    experience: { type: String, default: 'Verified Senior Mentor' },
    sessionCount: { type: Number, default: 14 },
    availability: { type: String, default: 'Weekdays & Weekends' },
    qualification: { type: String, default: 'Undergraduate Teaching Assistant' },
    languages: [{ type: String, default: 'English' }],
    teachingMode: { type: String, default: 'Online / Hybrid' },
    lessonTypes: [{ type: String, default: 'Individual' }],
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus' },
    university: { type: String },
    faculty: { type: String },
    department: { type: String },
    studentId: { type: String },
    phone: { type: String },
    accountStatus: {
      type: String,
      enum: ['active', 'pending', 'under_review', 'suspended', 'rejected', 'expired'],
      default: 'active',
    },
    isVerified: { type: Boolean, default: false },
    verificationStatus: {
      type: String,
      enum: ['unverified', 'pending', 'under_review', 'verified', 'approved', 'rejected'],
      default: 'unverified',
    },
    faceVerifiedAt: { type: Date },
    idPhoto: { type: String },
    referenceFaceImage: { type: String },
    passwordResetCode: { type: String },
    passwordResetExpires: { type: Date },
    passwordResetVerified: { type: Boolean, default: false },
    loginCode: { type: String },
    loginCodeExpires: { type: Date },
    tokenVersion: { type: Number, default: 0 },
    twoFactorEnabled: { type: Boolean, default: false },
    biometricEnabled: { type: Boolean, default: false },
    notificationPrefs: {
      sessionReminders: { type: Boolean, default: true },
      chatMessages: { type: Boolean, default: true },
      bookingUpdates: { type: Boolean, default: true },
      verificationAlerts: { type: Boolean, default: true },
      semesterRenewals: { type: Boolean, default: true },
      facultyNews: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare plain password with stored hash
userSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

// Never expose password in JSON responses
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const hidden = ret as {
      password?: string;
      loginCode?: string;
      loginCodeExpires?: Date;
      passwordResetCode?: string;
      passwordResetExpires?: Date;
      idPhoto?: string;
      referenceFaceImage?: string;
    };
    delete hidden.password;
    delete hidden.loginCode;
    delete hidden.loginCodeExpires;
    delete hidden.passwordResetCode;
    delete hidden.passwordResetExpires;
    delete hidden.idPhoto;
    delete hidden.referenceFaceImage;
    return ret;
  },
});

export default mongoose.model<IUser>('User', userSchema);

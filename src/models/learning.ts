import mongoose, { Document, Schema } from 'mongoose';

export interface IStudyWeek extends Document {
  studentId: mongoose.Types.ObjectId;
  seedKey: string;
  sourcePage: 'plans';
  hoursGoal: number;
  days: { day: string; hours: number }[];
}

export interface IStudyGoal extends Document {
  studentId: mongoose.Types.ObjectId;
  seedKey: string;
  sourcePage: 'plans';
  title: string;
  dueLabel: string;
  current: number;
  total: number;
  tag: string;
  completed: boolean;
}

export interface ILearningActivity extends Document {
  studentId: mongoose.Types.ObjectId;
  seedKey: string;
  sourcePage: 'activity';
  moduleCode: string;
  moduleName: string;
  topic: string;
  activityType: string;
  done: number;
  total: number;
  minutesLeft: number;
}

export interface IStudyPlan extends Document {
  studentId: mongoose.Types.ObjectId;
  seedKey: string;
  sourcePage: 'plans';
  title: string;
  moduleCode: string;
  dueDate: Date;
  status: 'active' | 'upcoming' | 'done';
  progress: number;
}

export interface IStudyMaterial extends Document {
  studentId: mongoose.Types.ObjectId;
  seedKey: string;
  sourcePage: 'materials';
  title: string;
  kind: 'pdf' | 'set' | 'notes';
  sourceLabel: string;
  sourceType: 'group' | 'session';
  uploadedAt: Date;
}

export interface IAssessment extends Document {
  studentId: mongoose.Types.ObjectId;
  seedKey: string;
  sourcePage: 'assessments';
  type: 'exam' | 'assignment';
  title: string;
  subject: string;
  scheduledAt?: Date;
  dueDate?: Date;
  durationMin?: number;
  marks?: number;
  status: 'upcoming' | 'open' | 'submitted';
}

export interface IDiscussion extends Document {
  studentId: mongoose.Types.ObjectId;
  seedKey: string;
  sourcePage: 'discussions';
  title: string;
  group: string;
  authorName: string;
  authorInitials: string;
  preview: string;
  votes: number;
  joined: boolean;
  createdAt: Date;
}

export interface IChatPodMessage extends Document {
  studentId: mongoose.Types.ObjectId;
  seedKey: string;
  sourcePage: 'chatPod';
  authorName: string;
  authorInitials: string;
  text: string;
  unread: boolean;
  createdAt: Date;
}

const studyWeekSchema = new Schema<IStudyWeek>({
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  seedKey: { type: String, required: true },
  sourcePage: { type: String, default: 'plans' },
  hoursGoal: { type: Number, required: true },
  days: [{ day: String, hours: Number }],
}, { timestamps: true });

const studyGoalSchema = new Schema<IStudyGoal>({
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  seedKey: { type: String, required: true },
  sourcePage: { type: String, default: 'plans' },
  title: { type: String, required: true },
  dueLabel: { type: String, required: true },
  current: { type: Number, default: 0 },
  total: { type: Number, default: 1 },
  tag: { type: String, default: '' },
  completed: { type: Boolean, default: false },
}, { timestamps: true });

const learningActivitySchema = new Schema<ILearningActivity>({
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  seedKey: { type: String, required: true },
  sourcePage: { type: String, default: 'activity' },
  moduleCode: { type: String, required: true },
  moduleName: { type: String, required: true },
  topic: { type: String, required: true },
  activityType: { type: String, required: true },
  done: { type: Number, default: 0 },
  total: { type: Number, default: 1 },
  minutesLeft: { type: Number, default: 0 },
}, { timestamps: true });

const studyPlanSchema = new Schema<IStudyPlan>({
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  seedKey: { type: String, required: true },
  sourcePage: { type: String, default: 'plans' },
  title: { type: String, required: true },
  moduleCode: { type: String, required: true },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ['active', 'upcoming', 'done'], default: 'active' },
  progress: { type: Number, default: 0 },
}, { timestamps: true });

const studyMaterialSchema = new Schema<IStudyMaterial>({
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  seedKey: { type: String, required: true },
  sourcePage: { type: String, default: 'materials' },
  title: { type: String, required: true },
  kind: { type: String, enum: ['pdf', 'set', 'notes'], default: 'pdf' },
  sourceLabel: { type: String, required: true },
  sourceType: { type: String, enum: ['group', 'session'], required: true },
  uploadedAt: { type: Date, default: Date.now },
}, { timestamps: true });

const assessmentSchema = new Schema<IAssessment>({
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  seedKey: { type: String, required: true },
  sourcePage: { type: String, default: 'assessments' },
  type: { type: String, enum: ['exam', 'assignment'], required: true },
  title: { type: String, required: true },
  subject: { type: String, required: true },
  scheduledAt: { type: Date },
  dueDate: { type: Date },
  durationMin: { type: Number },
  marks: { type: Number },
  status: { type: String, enum: ['upcoming', 'open', 'submitted'], default: 'upcoming' },
}, { timestamps: true });

const discussionSchema = new Schema<IDiscussion>({
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  seedKey: { type: String, required: true },
  sourcePage: { type: String, default: 'discussions' },
  title: { type: String, required: true },
  group: { type: String, required: true },
  authorName: { type: String, required: true },
  authorInitials: { type: String, required: true },
  preview: { type: String, required: true },
  votes: { type: Number, default: 0 },
  joined: { type: Boolean, default: false },
}, { timestamps: true });

const chatPodMessageSchema = new Schema<IChatPodMessage>({
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  seedKey: { type: String, required: true },
  sourcePage: { type: String, default: 'chatPod' },
  authorName: { type: String, required: true },
  authorInitials: { type: String, required: true },
  text: { type: String, required: true },
  unread: { type: Boolean, default: true },
}, { timestamps: true });

studyWeekSchema.index({ studentId: 1, seedKey: 1 }, { unique: true });
studyGoalSchema.index({ studentId: 1, seedKey: 1 }, { unique: true });
learningActivitySchema.index({ studentId: 1, seedKey: 1 }, { unique: true });
studyPlanSchema.index({ studentId: 1, seedKey: 1 }, { unique: true });
studyMaterialSchema.index({ studentId: 1, seedKey: 1 }, { unique: true });
assessmentSchema.index({ studentId: 1, seedKey: 1 }, { unique: true });
discussionSchema.index({ studentId: 1, seedKey: 1 }, { unique: true });
chatPodMessageSchema.index({ studentId: 1, seedKey: 1 }, { unique: true });

export const StudyWeek = mongoose.model<IStudyWeek>('StudyWeek', studyWeekSchema);
export const StudyGoal = mongoose.model<IStudyGoal>('StudyGoal', studyGoalSchema);
export const LearningActivity = mongoose.model<ILearningActivity>('LearningActivity', learningActivitySchema);
export const StudyPlan = mongoose.model<IStudyPlan>('StudyPlan', studyPlanSchema);
export const StudyMaterial = mongoose.model<IStudyMaterial>('StudyMaterial', studyMaterialSchema);
export const Assessment = mongoose.model<IAssessment>('Assessment', assessmentSchema);
export const Discussion = mongoose.model<IDiscussion>('Discussion', discussionSchema);
export const ChatPodMessage = mongoose.model<IChatPodMessage>('ChatPodMessage', chatPodMessageSchema);

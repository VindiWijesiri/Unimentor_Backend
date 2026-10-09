import mongoose, { Document, Schema } from 'mongoose';

export type TutorStudentStatus = 'review' | 'graded' | 'atRisk';

export interface ITutorWorkspace extends Document {
  tutorId: mongoose.Types.ObjectId;
  seedKey: string;
  sourcePage: 'workspace';
  cohort: string;
  assignedPacks: number;
  classMastery: number;
  masteryDelta: number;
  plagiarismFlags: number;
}

export interface ITutorStudent extends Document {
  tutorId: mongoose.Types.ObjectId;
  studentUserId?: mongoose.Types.ObjectId;
  seedKey: string;
  sourcePage: 'students';
  name: string;
  initials: string;
  studentCode: string;
  year: number;
  programme: string;
  moduleCode: string;
  status: TutorStudentStatus;
  priority: number;
  workTitle: string;
  taskLabel?: string;
  questionCount?: number;
  pdfReady?: boolean;
  score?: number;
  maxScore: number;
  packsDownloaded: number;
  classRank?: number;
  midtermPercent?: number;
  feedbackSent?: boolean;
  submittedAt?: Date;
  gradedAt?: Date;
}

export interface ITutorPack extends Document {
  tutorId: mongoose.Types.ObjectId;
  seedKey: string;
  sourcePage: 'packs';
  title: string;
  kind: 'mock' | 'study' | 'recovery';
  assignedCount: number;
}

const workspaceSchema = new Schema<ITutorWorkspace>({
  tutorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  seedKey: { type: String, required: true },
  sourcePage: { type: String, default: 'workspace' },
  cohort: { type: String, default: 'DSA & OOP' },
  assignedPacks: { type: Number, default: 24 },
  classMastery: { type: Number, default: 78.4 },
  masteryDelta: { type: Number, default: 4.2 },
  plagiarismFlags: { type: Number, default: 0 },
}, { timestamps: true });

const studentSchema = new Schema<ITutorStudent>({
  tutorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  studentUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  seedKey: { type: String, required: true },
  sourcePage: { type: String, default: 'students' },
  name: { type: String, required: true },
  initials: { type: String, required: true },
  studentCode: { type: String, required: true },
  year: { type: Number, required: true },
  programme: { type: String, required: true },
  moduleCode: { type: String, required: true },
  status: { type: String, enum: ['review', 'graded', 'atRisk'], required: true },
  priority: { type: Number, default: 3 },
  workTitle: { type: String, required: true },
  taskLabel: { type: String },
  questionCount: { type: Number },
  pdfReady: { type: Boolean, default: false },
  score: { type: Number },
  maxScore: { type: Number, default: 100 },
  packsDownloaded: { type: Number, default: 0 },
  classRank: { type: Number },
  midtermPercent: { type: Number },
  feedbackSent: { type: Boolean, default: false },
  submittedAt: { type: Date },
  gradedAt: { type: Date },
}, { timestamps: true });

const packSchema = new Schema<ITutorPack>({
  tutorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  seedKey: { type: String, required: true },
  sourcePage: { type: String, default: 'packs' },
  title: { type: String, required: true },
  kind: { type: String, enum: ['mock', 'study', 'recovery'], required: true },
  assignedCount: { type: Number, default: 0 },
}, { timestamps: true });

workspaceSchema.index({ tutorId: 1, seedKey: 1 }, { unique: true });
studentSchema.index({ tutorId: 1, seedKey: 1 }, { unique: true });
packSchema.index({ tutorId: 1, seedKey: 1 }, { unique: true });

export const TutorWorkspace = mongoose.model<ITutorWorkspace>('TutorWorkspace', workspaceSchema);
export const TutorStudent = mongoose.model<ITutorStudent>('TutorStudent', studentSchema);
export const TutorPack = mongoose.model<ITutorPack>('TutorPack', packSchema);

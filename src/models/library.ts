import mongoose, { Document, Schema, Types } from 'mongoose';

export type LibraryKind = 'video' | 'pdf' | 'quiz' | 'audio' | 'code';
export type LibrarySource = 'group' | 'session' | 'live' | 'library';

export interface ILibraryQuestion {
  prompt: string;
  options: string[];
  answer: number;
  explanation?: string;
}

export interface ILibraryFile {
  name: string;
  language: string;
  content: string;
}

export interface ILibraryMaterial extends Document {
  seedKey?: string;
  kind: LibraryKind;
  source: LibrarySource;
  title: string;
  subtitle?: string;
  fromLabel?: string;
  description: string;
  body: string;
  moduleCode?: string;
  moduleName?: string;
  durationLabel?: string;
  sizeLabel?: string;
  pageCount?: number;
  fileCount?: number;
  questionCount?: number;
  downloads: number;
  owner: Types.ObjectId;
  conversation?: Types.ObjectId;
  savedBy: Types.ObjectId[];
  questions: ILibraryQuestion[];
  files: ILibraryFile[];
  tags: string[];
  progress: Map<string, {
    saved?: boolean;
    watchedPercent?: number;
    quizScore?: number;
    quizBest?: number;
    audioSpeed?: number;
    completed?: boolean;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const materialSchema = new Schema<ILibraryMaterial>({
  seedKey: { type: String, unique: true, sparse: true },
  kind: { type: String, enum: ['video', 'pdf', 'quiz', 'audio', 'code'], required: true },
  source: { type: String, enum: ['group', 'session', 'live', 'library'], default: 'library' },
  title: { type: String, required: true, trim: true },
  subtitle: { type: String, default: '' },
  fromLabel: { type: String, default: '' },
  description: { type: String, default: '' },
  body: { type: String, default: '' },
  moduleCode: String,
  moduleName: String,
  durationLabel: String,
  sizeLabel: String,
  pageCount: Number,
  fileCount: Number,
  questionCount: Number,
  downloads: { type: Number, default: 0 },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  conversation: { type: Schema.Types.ObjectId, ref: 'PodConversation' },
  savedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  questions: [{
    prompt: String,
    options: [String],
    answer: Number,
    explanation: String,
  }],
  files: [{
    name: String,
    language: String,
    content: String,
  }],
  tags: [{ type: String }],
  progress: { type: Map, of: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

materialSchema.index({ kind: 1, source: 1, createdAt: -1 });
materialSchema.index({ conversation: 1, createdAt: -1 });

export const LibraryMaterial = mongoose.model<ILibraryMaterial>('LibraryMaterial', materialSchema);

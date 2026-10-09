import mongoose, { Document, Schema } from 'mongoose';

export const ASSESSMENT_KINDS = [
  'mcq',
  'true_false',
  'short_answer',
  'fill_blank',
  'matching',
  'ordering',
  'drag_drop',
  'essay',
  'coding',
  'file_project',
  'scenario',
] as const;

export type AssessmentKind = (typeof ASSESSMENT_KINDS)[number];

export type PaperStatus = 'draft' | 'pending_review' | 'published' | 'changes_requested' | 'closed';

export type WorkAnswer = {
  choiceIds?: string[];
  boolean?: boolean | null;
  text?: string;
  blanks?: Record<string, string>;
  matches?: Record<string, string>;
  order?: string[];
  placements?: Record<string, string>;
  files?: { name: string; sizeMb: number }[];
  repoUrl?: string;
  note?: string;
};

export type WorkQuestion = {
  id: string;
  kind: AssessmentKind;
  prompt: string;
  marks: number;
  topic?: string;
  hint?: string;
  manual?: boolean;
  multi?: boolean;
  choices?: { id: string; label: string; detail?: string }[];
  statement?: string;
  definition?: string;
  trueDetail?: string;
  falseDetail?: string;
  formula?: string;
  remember?: string;
  segments?: { text?: string; blankId?: string }[];
  bank?: string[];
  left?: { id: string; title: string; meta?: string }[];
  right?: { id: string; title: string; meta?: string }[];
  steps?: { id: string; title: string; body: string }[];
  buckets?: { id: string; title: string; subtitle?: string }[];
  tokens?: { id: string; label: string }[];
  tags?: string[];
  rubric?: { title: string; detail: string; points: string }[];
  minWords?: number;
  maxWords?: number;
  starter?: string;
  languages?: string[];
  filename?: string;
  starterCode?: string;
  tests?: { name: string; detail?: string }[];
  constraints?: string[];
  checklist?: { label: string; done?: boolean }[];
  accept?: string;
  maxMb?: number;
  scenarioTitle?: string;
  scenarioBody?: string;
  incident?: string;
  pipeline?: { label: string; value: string }[];
  metrics?: { label: string; value: string; note?: string }[];
  trace?: string[];
  objective?: string;
  codeSnippet?: { filename: string; lines: string[] };
  key?: {
    choiceIds?: string[];
    boolean?: boolean;
    text?: string;
    tolerance?: number;
    blanks?: Record<string, string[]>;
    matches?: Record<string, string>;
    order?: string[];
    placements?: Record<string, string>;
    includes?: string[];
  };
};

export interface IAssessmentPaper extends Document {
  seedKey?: string;
  tutorId: mongoose.Types.ObjectId;
  tutorName: string;
  moduleCode: string;
  moduleName: string;
  title: string;
  kind: AssessmentKind;
  kindLabel: string;
  marks: number;
  durationMin: number;
  chips: string[];
  dueLabel: string;
  detail: string;
  status: PaperStatus;
  reviewNote?: string;
  urgent: boolean;
  gradesReleased: boolean;
  assignedStudentIds?: mongoose.Types.ObjectId[];
  questions: WorkQuestion[];
}

export interface IAssessmentAttempt extends Document {
  paperId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  answers: Record<string, WorkAnswer>;
  flagged: string[];
  questionIndex: number;
  status: 'in_progress' | 'submitted' | 'graded';
  score: number | null;
  maxScore: number;
  feedback?: string;
  gradeLabel?: string;
  breakdown?: {
    questionId: string;
    prompt: string;
    awarded: number;
    max: number;
    correct: boolean;
    note: string;
    expected?: string;
    given?: string;
  }[];
  progress: number;
  startedAt?: Date;
  submittedAt?: Date;
}

export interface IAssessmentGrowth extends Document {
  studentId: mongoose.Types.ObjectId;
  semester: string;
  weekLabel: string;
  growth: string;
  growthDetail: string;
  cohortRank: string;
  stats: { assessments: number; hours: string; gpa: string };
  target: number;
  modules: string[];
  points: { label: string; value: number }[];
  competencies: { title: string; delta: string; score: number; detail: string }[];
  timeline: {
    id: string;
    moduleCode: string;
    moduleName: string;
    title: string;
    dateLabel: string;
    delta: string;
    beforeLabel: string;
    beforeScore: string;
    midLabel: string;
    midValue: string;
    afterLabel: string;
    afterScore: string;
    quote: string;
    person: string;
    role: string;
    paperSeed?: string;
  }[];
  focus: { title: string; detail: string; boost: string };
  momentum: {
    avgScore: number;
    completed: number;
    pending: number;
    urgent: number;
    percentile: string;
    spotlightTitle: string;
    spotlightDetail: string;
  };
}

export interface ICatalogMaterial extends Document {
  seedKey: string;
  moduleCode: string;
  badge: string;
  title: string;
  author: string;
  priceLabel: string;
  strike?: string;
  meta: string;
  tier: 'premium' | 'free' | 'deal' | 'community';
  detail: string;
}

const paperSchema = new Schema<IAssessmentPaper>({
  seedKey: { type: String, unique: true, sparse: true },
  tutorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tutorName: { type: String, default: 'Tutor' },
  moduleCode: { type: String, required: true },
  moduleName: { type: String, required: true },
  title: { type: String, required: true },
  kind: { type: String, enum: ASSESSMENT_KINDS, required: true },
  kindLabel: { type: String, required: true },
  marks: { type: Number, default: 10 },
  durationMin: { type: Number, default: 30 },
  chips: [{ type: String }],
  dueLabel: { type: String, default: '' },
  detail: { type: String, default: '' },
  status: {
    type: String,
    enum: ['draft', 'pending_review', 'published', 'changes_requested', 'closed'],
    default: 'draft',
  },
  reviewNote: { type: String, default: '' },
  urgent: { type: Boolean, default: false },
  gradesReleased: { type: Boolean, default: false },
  assignedStudentIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  questions: { type: Schema.Types.Mixed, default: [] },
}, { timestamps: true });

const attemptSchema = new Schema<IAssessmentAttempt>({
  paperId: { type: Schema.Types.ObjectId, ref: 'AssessmentPaper', required: true, index: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  answers: { type: Schema.Types.Mixed, default: {} },
  flagged: [{ type: String }],
  questionIndex: { type: Number, default: 0 },
  status: { type: String, enum: ['in_progress', 'submitted', 'graded'], default: 'in_progress' },
  score: { type: Number, default: null },
  maxScore: { type: Number, default: 0 },
  feedback: { type: String, default: '' },
  gradeLabel: { type: String, default: '' },
  breakdown: { type: Schema.Types.Mixed, default: [] },
  progress: { type: Number, default: 0 },
  startedAt: { type: Date },
  submittedAt: { type: Date },
}, { timestamps: true });

attemptSchema.index({ paperId: 1, studentId: 1 }, { unique: true });

const growthSchema = new Schema<IAssessmentGrowth>({
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  semester: String,
  weekLabel: String,
  growth: String,
  growthDetail: String,
  cohortRank: String,
  stats: { type: Schema.Types.Mixed, default: {} },
  target: Number,
  modules: [String],
  points: { type: Schema.Types.Mixed, default: [] },
  competencies: { type: Schema.Types.Mixed, default: [] },
  timeline: { type: Schema.Types.Mixed, default: [] },
  focus: { type: Schema.Types.Mixed, default: {} },
  momentum: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

const catalogSchema = new Schema<ICatalogMaterial>({
  seedKey: { type: String, unique: true },
  moduleCode: String,
  badge: String,
  title: String,
  author: String,
  priceLabel: String,
  strike: String,
  meta: String,
  tier: { type: String, enum: ['premium', 'free', 'deal', 'community'], default: 'free' },
  detail: String,
}, { timestamps: true });

export const AssessmentPaper = mongoose.model<IAssessmentPaper>('AssessmentPaper', paperSchema);
export const AssessmentAttempt = mongoose.model<IAssessmentAttempt>('AssessmentAttempt', attemptSchema);
export const AssessmentGrowth = mongoose.model<IAssessmentGrowth>('AssessmentGrowth', growthSchema);
export const CatalogMaterial = mongoose.model<ICatalogMaterial>('CatalogMaterial', catalogSchema);

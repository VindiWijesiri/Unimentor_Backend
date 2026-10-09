import mongoose, { Document, Schema } from 'mongoose';

export type GoalMilestone = {
  id: string;
  title: string;
  detail: string;
  status: 'done' | 'active' | 'locked';
  dueLabel: string;
  progressLabel?: string;
};

export type GoalAssessmentLink = {
  id: string;
  name: string;
  type: 'Exam' | 'Assignment' | 'Quiz';
  dateLabel: string;
  timeLabel: string;
  totalMarks: number;
  targetMark: number;
  weight: number;
  score: number | null;
  statusLabel: string;
  evidence?: string;
  feedback?: string;
};

export type GoalTask = {
  id: string;
  title: string;
  kind: string;
  minutes: number;
  dueLabel: string;
  status: 'open' | 'done';
};

export type GoalTutor = {
  key: string;
  name: string;
  rating: number;
  price: string;
  specialty: string;
  slot: string;
  verified: boolean;
};

export interface IGoalPlan extends Document {
  studentId: mongoose.Types.ObjectId;
  seedKey: string;
  moduleCode: string;
  moduleName: string;
  title: string;
  summary: string;
  priority: string;
  progress: number;
  gradeLabel: string;
  targetPercent: number;
  targetGrade: string;
  delta: string;
  daysLeft: number;
  dueLabel: string;
  hoursLogged: number;
  supportLabel: string;
  tutorName: string;
  tutorRole: string;
  tutorSlot: string;
  topics: { title: string; score: number; note: string }[];
  analytics: {
    projected: number;
    projectedGrade: string;
    certainty: number;
    baseline: number;
    midterm: number;
    selfStudy: number;
    tutoring: number;
    groups: number;
    pace: string;
  };
  milestones: GoalMilestone[];
  assessments: GoalAssessmentLink[];
  tasks: GoalTask[];
  tutors: GoalTutor[];
  sessions: { id: string; title: string; when: string }[];
  credentialId: string;
  completed: boolean;
}

const goalPlanSchema = new Schema<IGoalPlan>({
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  seedKey: { type: String, required: true },
  moduleCode: String,
  moduleName: String,
  title: String,
  summary: String,
  priority: String,
  progress: { type: Number, default: 0 },
  gradeLabel: String,
  targetPercent: Number,
  targetGrade: String,
  delta: String,
  daysLeft: Number,
  dueLabel: String,
  hoursLogged: { type: Number, default: 0 },
  supportLabel: String,
  tutorName: String,
  tutorRole: String,
  tutorSlot: String,
  topics: { type: Schema.Types.Mixed, default: [] },
  analytics: { type: Schema.Types.Mixed, default: {} },
  milestones: { type: Schema.Types.Mixed, default: [] },
  assessments: { type: Schema.Types.Mixed, default: [] },
  tasks: { type: Schema.Types.Mixed, default: [] },
  tutors: { type: Schema.Types.Mixed, default: [] },
  sessions: { type: Schema.Types.Mixed, default: [] },
  credentialId: String,
  completed: { type: Boolean, default: false },
}, { timestamps: true });

goalPlanSchema.index({ studentId: 1, seedKey: 1 }, { unique: true });

export const GoalPlan = mongoose.model<IGoalPlan>('GoalPlan', goalPlanSchema);

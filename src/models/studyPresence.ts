import mongoose, { Document, Schema } from 'mongoose';

export interface IStudyPresence extends Document {
  studentId: mongoose.Types.ObjectId;
  weekStart: string;
  hoursGoal: number;
  days: { date: string; day: string; seconds: number }[];
}

const studyPresenceSchema = new Schema<IStudyPresence>({
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  weekStart: { type: String, required: true },
  hoursGoal: { type: Number, default: 20 },
  days: [{ date: String, day: String, seconds: { type: Number, default: 0 } }],
}, { timestamps: true });

studyPresenceSchema.index({ studentId: 1, weekStart: 1 }, { unique: true });

export const StudyPresence = mongoose.model<IStudyPresence>('StudyPresence', studyPresenceSchema);

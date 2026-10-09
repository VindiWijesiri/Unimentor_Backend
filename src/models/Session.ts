import mongoose, { Document, Schema } from 'mongoose';

export interface ISession extends Document {
  mentorId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  subject: string;
  scheduledAt: Date;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  isLive?: boolean;
  durationMin?: number;
  moduleCode?: string;
  sessionKind?: 'booking' | 'tutoring';
  seedKey?: string;
}

const sessionSchema = new Schema<ISession>(
  {
    mentorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    scheduledAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending',
    },
    notes: { type: String },
    isLive: { type: Boolean, default: false },
    durationMin: { type: Number },
    moduleCode: { type: String },
    sessionKind: { type: String, enum: ['booking', 'tutoring'], default: 'booking' },
    seedKey: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<ISession>('Session', sessionSchema);

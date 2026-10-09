import mongoose, { Document, Schema } from 'mongoose';

export interface IPayment extends Document {
  sessionId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  mentorId: mongoose.Types.ObjectId;
  amountLkr: number;
  hours: number;
  status: 'due' | 'recorded';
  subject: string;
}

const paymentSchema = new Schema<IPayment>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true, unique: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mentorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amountLkr: { type: Number, required: true },
    hours: { type: Number, required: true },
    status: { type: String, enum: ['due', 'recorded'], default: 'due' },
    subject: { type: String, required: true },
  },
  { timestamps: true },
);

export default mongoose.model<IPayment>('Payment', paymentSchema);

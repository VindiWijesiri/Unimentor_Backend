import mongoose, { Document, Schema } from 'mongoose';

export type NoticeKind = 'booking' | 'review' | 'grade' | 'session' | 'payment';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  kind: NoticeKind;
  title: string;
  body: string;
  refId?: string;
  read: boolean;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind: { type: String, enum: ['booking', 'review', 'grade', 'session', 'payment'], required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    refId: { type: String },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.model<INotification>('Notification', notificationSchema);

import mongoose, { Document, Schema } from 'mongoose';

export type DocumentKind = 'front' | 'back' | 'transcript';
export type DocumentReviewStatus = 'pending' | 'approved' | 'reupload';

export interface IUserDocument extends Document {
  userId: mongoose.Types.ObjectId;
  kind: DocumentKind;
  image: string;
  fileName: string;
  status: DocumentReviewStatus;
}

const userDocumentSchema = new Schema<IUserDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind: { type: String, enum: ['front', 'back', 'transcript'], required: true },
    image: { type: String, required: true },
    fileName: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'reupload'], default: 'pending' },
  },
  { timestamps: true },
);

userDocumentSchema.index({ userId: 1, kind: 1 }, { unique: true });

export default mongoose.model<IUserDocument>('UserDocument', userDocumentSchema);

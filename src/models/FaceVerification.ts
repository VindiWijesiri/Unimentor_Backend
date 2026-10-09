import mongoose, { Document, Schema } from 'mongoose';

export interface IFaceVerification extends Document {
  userId: mongoose.Types.ObjectId;
  status: 'verified' | 'failed' | 'error';
  confidence: number;
  threshold: number;
  thresholds?: {
    '1e-3'?: number;
    '1e-4'?: number;
    '1e-5'?: number;
  };
  faceId1?: string;
  faceId2?: string;
  errorMessage?: string;
  referenceImageSource?: string;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const faceVerificationSchema = new Schema<IFaceVerification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['verified', 'failed', 'error'],
      required: true,
      default: 'failed',
    },
    confidence: { type: Number, required: true, default: 0 },
    threshold: { type: Number, required: true, default: 69.101 },
    thresholds: {
      '1e-3': { type: Number },
      '1e-4': { type: Number },
      '1e-5': { type: Number },
    },
    faceId1: { type: String },
    faceId2: { type: String },
    errorMessage: { type: String },
    referenceImageSource: { type: String },
    verifiedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<IFaceVerification>('FaceVerification', faceVerificationSchema);

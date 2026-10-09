import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IReview extends Document {
  tutor: string;
  student: Types.ObjectId;
  studentName: string;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    tutor: { type: String, required: true, index: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    studentName: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

reviewSchema.index({ tutor: 1, student: 1 }, { unique: true });

export default mongoose.model<IReview>('Review', reviewSchema);

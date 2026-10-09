import mongoose, { Document, Schema } from 'mongoose';

export type CampusStatus = 'pending' | 'approved' | 'rejected';

export interface ICampus extends Document {
  name: string;
  shortCode: string;
  city: string;
  country: string;
  address?: string;
  website?: string;
  faculties: string[];
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  status: CampusStatus;
  adminUser?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const campusSchema = new Schema<ICampus>(
  {
    name: { type: String, required: true, trim: true },
    shortCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    city: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true, default: 'Sri Lanka' },
    address: { type: String, trim: true },
    website: { type: String, trim: true },
    faculties: [{ type: String, trim: true }],
    contactName: { type: String, required: true, trim: true },
    contactEmail: { type: String, required: true, lowercase: true, trim: true },
    contactPhone: { type: String, trim: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
    adminUser: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

campusSchema.set('toJSON', {
  transform: (_doc, ret) => ret,
});

export default mongoose.model<ICampus>('Campus', campusSchema);

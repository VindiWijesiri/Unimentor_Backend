import mongoose, { Document, Schema } from 'mongoose';

export interface IRegisteredAttendee {
  studentId?: mongoose.Types.ObjectId | string;
  studentName: string;
  studentEmail: string;
  studentAvatar?: string;
  faceVerificationPhoto?: string;
  isFaceVerified?: boolean;
  registeredAt: Date;
  status: 'confirmed' | 'pending' | 'attended' | 'cancelled';
  bookingType: 'individual' | 'group';
  groupName?: string;
  groupSize?: number;
  notes?: string;
  feePaid?: number;
}

export interface ISlot extends Document {
  mentorId: mongoose.Types.ObjectId | string;
  mentorName: string;
  title: string;
  module: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  timeRange: string;
  fee: number;
  type: '1-on-1' | 'group' | 'both';
  maxCapacity: number;
  bookedCount: number;
  description: string;
  prerequisites?: string;
  mode: 'Online' | 'In-Person' | 'Hybrid';
  location: string;
  targetBatch?: string;
  registeredAttendees: IRegisteredAttendee[];
  isAvailable: boolean;
  hasConflict?: boolean;
  conflictDetails?: {
    existingSessionTitle: string;
    existingWith: string;
    time: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const registeredAttendeeSchema = new Schema<IRegisteredAttendee>(
  {
    studentId: { type: Schema.Types.Mixed },
    studentName: { type: String, required: true },
    studentEmail: { type: String, required: true },
    studentAvatar: { type: String },
    faceVerificationPhoto: { type: String },
    isFaceVerified: { type: Boolean, default: false },
    registeredAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['confirmed', 'pending', 'attended', 'cancelled'],
      default: 'confirmed',
    },
    bookingType: {
      type: String,
      enum: ['individual', 'group'],
      default: 'individual',
    },
    groupName: { type: String },
    groupSize: { type: Number, default: 1 },
    notes: { type: String },
    feePaid: { type: Number, default: 0 },
  },
  { _id: true }
);

const slotSchema = new Schema<ISlot>(
  {
    mentorId: { type: Schema.Types.Mixed, required: true },
    mentorName: { type: String, required: true },
    title: { type: String, required: true },
    module: { type: String, required: true },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    duration: { type: String, default: '60 Mins' },
    timeRange: { type: String, required: true },
    fee: { type: Number, required: true, default: 2000 },
    type: {
      type: String,
      enum: ['1-on-1', 'group', 'both'],
      default: 'both',
    },
    maxCapacity: { type: Number, default: 5 },
    bookedCount: { type: Number, default: 0 },
    description: { type: String, default: '' },
    prerequisites: { type: String, default: 'None' },
    mode: {
      type: String,
      enum: ['Online', 'In-Person', 'Hybrid'],
      default: 'Online',
    },
    location: { type: String, default: 'Microsoft Teams Meeting' },
    targetBatch: { type: String, default: 'All Batches' },
    registeredAttendees: [registeredAttendeeSchema],
    isAvailable: { type: Boolean, default: true },
    hasConflict: { type: Boolean, default: false },
    conflictDetails: {
      existingSessionTitle: { type: String },
      existingWith: { type: String },
      time: { type: String },
    },
  },
  { timestamps: true }
);

export default mongoose.model<ISlot>('Slot', slotSchema);

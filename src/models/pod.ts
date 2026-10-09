import mongoose, { Document, Schema, Types } from 'mongoose';

export type PodConversationType = 'direct' | 'group';
export type PodCategory = 'squad' | 'tutor' | 'mentor' | 'kuppiya' | 'circle';
export type PodMessageKind = 'text' | 'voice' | 'file' | 'proposal' | 'assessment';

export interface IPodConversation extends Document {
  seedKey?: string;
  type: PodConversationType;
  category: PodCategory;
  title: string;
  participants: Types.ObjectId[];
  createdBy: Types.ObjectId;
  lastMessageText: string;
  lastMessageAt: Date;
  lastSenderName: string;
  unreadCounts: Map<string, number>;
  meta: {
    leadName?: string;
    leadInitials?: string;
    memberCount?: number;
    subtitle?: string;
    actionLabel?: string;
    price?: string;
    scheduleLabel?: string;
    assessmentTitle?: string;
    assessmentProgress?: string;
    assessmentHint?: string;
    voicePreview?: string;
    pollVotes?: number;
    isNew?: boolean;
    moduleCode?: string;
    proposalStatus?: 'pending' | 'accepted' | 'declined';
    flashLabel?: string;
    votedUserIds?: string;
  };
}

export interface IPodMessage extends Document {
  conversation: Types.ObjectId;
  sender: Types.ObjectId;
  senderName: string;
  senderInitials: string;
  text: string;
  kind: PodMessageKind;
  readBy: Types.ObjectId[];
  meta?: Record<string, string | number | boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IPodConversation>({
  seedKey: { type: String, unique: true, sparse: true },
  type: { type: String, enum: ['direct', 'group'], required: true },
  category: { type: String, enum: ['squad', 'tutor', 'mentor', 'kuppiya', 'circle'], required: true },
  title: { type: String, required: true },
  participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  lastMessageText: { type: String, default: '' },
  lastMessageAt: { type: Date, default: Date.now },
  lastSenderName: { type: String, default: '' },
  unreadCounts: { type: Map, of: Number, default: {} },
  meta: {
    leadName: String,
    leadInitials: String,
    memberCount: Number,
    subtitle: String,
    actionLabel: String,
    price: String,
    scheduleLabel: String,
    assessmentTitle: String,
    assessmentProgress: String,
    assessmentHint: String,
    voicePreview: String,
    pollVotes: Number,
    isNew: Boolean,
    moduleCode: String,
    proposalStatus: { type: String, enum: ['pending', 'accepted', 'declined'] },
    flashLabel: String,
    votedUserIds: String,
  },
}, { timestamps: true });

conversationSchema.index({ participants: 1, lastMessageAt: -1 });

const messageSchema = new Schema<IPodMessage>({
  conversation: { type: Schema.Types.ObjectId, ref: 'PodConversation', required: true, index: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  senderName: { type: String, required: true },
  senderInitials: { type: String, required: true },
  text: { type: String, required: true, trim: true, maxlength: 2000 },
  kind: { type: String, enum: ['text', 'voice', 'file', 'proposal', 'assessment'], default: 'text' },
  readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  meta: { type: Schema.Types.Mixed },
}, { timestamps: true });

messageSchema.index({ conversation: 1, createdAt: 1 });

export const PodConversation = mongoose.model<IPodConversation>('PodConversation', conversationSchema);
export const PodMessage = mongoose.model<IPodMessage>('PodMessage', messageSchema);

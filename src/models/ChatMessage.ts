import { Document, Schema, Types, model } from 'mongoose';

export interface IChatMessage extends Document {
  conversationKey: string;
  sender: Types.ObjectId;
  receiver: Types.ObjectId;
  text: string;
  read: boolean;
  messageType?: 'text' | 'voice' | 'system' | 'attachment';
  voiceDuration?: number;
  voiceWaveform?: number[];
  attachmentUrl?: string;
  attachmentName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const chatMessageSchema = new Schema<IChatMessage>(
  {
    conversationKey: { type: String, required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 3000 },
    read: { type: Boolean, default: false },
    messageType: {
      type: String,
      enum: ['text', 'voice', 'system', 'attachment'],
      default: 'text',
    },
    voiceDuration: { type: Number },
    voiceWaveform: { type: [Number], default: undefined },
    attachmentUrl: { type: String },
    attachmentName: { type: String },
  },
  { timestamps: true }
);

chatMessageSchema.index({ conversationKey: 1, createdAt: 1 });

export default model<IChatMessage>('ChatMessage', chatMessageSchema);

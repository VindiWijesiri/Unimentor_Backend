"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const chatMessageSchema = new mongoose_1.Schema({
    conversationKey: { type: String, required: true, index: true },
    sender: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
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
}, { timestamps: true });
chatMessageSchema.index({ conversationKey: 1, createdAt: 1 });
exports.default = (0, mongoose_1.model)('ChatMessage', chatMessageSchema);

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PodMessage = exports.PodConversation = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const conversationSchema = new mongoose_1.Schema({
    seedKey: { type: String, unique: true, sparse: true },
    type: { type: String, enum: ['direct', 'group'], required: true },
    category: { type: String, enum: ['squad', 'tutor', 'mentor', 'kuppiya', 'circle'], required: true },
    title: { type: String, required: true },
    participants: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true }],
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
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
const messageSchema = new mongoose_1.Schema({
    conversation: { type: mongoose_1.Schema.Types.ObjectId, ref: 'PodConversation', required: true, index: true },
    sender: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, required: true },
    senderInitials: { type: String, required: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    kind: { type: String, enum: ['text', 'voice', 'file', 'proposal', 'assessment'], default: 'text' },
    readBy: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    meta: { type: mongoose_1.Schema.Types.Mixed },
}, { timestamps: true });
messageSchema.index({ conversation: 1, createdAt: 1 });
exports.PodConversation = mongoose_1.default.model('PodConversation', conversationSchema);
exports.PodMessage = mongoose_1.default.model('PodMessage', messageSchema);

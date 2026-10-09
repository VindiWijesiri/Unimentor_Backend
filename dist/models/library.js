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
exports.LibraryMaterial = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const materialSchema = new mongoose_1.Schema({
    seedKey: { type: String, unique: true, sparse: true },
    kind: { type: String, enum: ['video', 'pdf', 'quiz', 'audio', 'code'], required: true },
    source: { type: String, enum: ['group', 'session', 'live', 'library'], default: 'library' },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: '' },
    fromLabel: { type: String, default: '' },
    description: { type: String, default: '' },
    body: { type: String, default: '' },
    moduleCode: String,
    moduleName: String,
    durationLabel: String,
    sizeLabel: String,
    pageCount: Number,
    fileCount: Number,
    questionCount: Number,
    downloads: { type: Number, default: 0 },
    owner: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    conversation: { type: mongoose_1.Schema.Types.ObjectId, ref: 'PodConversation' },
    savedBy: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    questions: [{
            prompt: String,
            options: [String],
            answer: Number,
            explanation: String,
        }],
    files: [{
            name: String,
            language: String,
            content: String,
        }],
    tags: [{ type: String }],
    progress: { type: Map, of: mongoose_1.Schema.Types.Mixed, default: {} },
}, { timestamps: true });
materialSchema.index({ kind: 1, source: 1, createdAt: -1 });
materialSchema.index({ conversation: 1, createdAt: -1 });
exports.LibraryMaterial = mongoose_1.default.model('LibraryMaterial', materialSchema);

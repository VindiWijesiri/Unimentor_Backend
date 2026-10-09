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
exports.TutorPack = exports.TutorStudent = exports.TutorWorkspace = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const workspaceSchema = new mongoose_1.Schema({
    tutorId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    seedKey: { type: String, required: true },
    sourcePage: { type: String, default: 'workspace' },
    cohort: { type: String, default: 'DSA & OOP' },
    assignedPacks: { type: Number, default: 24 },
    classMastery: { type: Number, default: 78.4 },
    masteryDelta: { type: Number, default: 4.2 },
    plagiarismFlags: { type: Number, default: 0 },
}, { timestamps: true });
const studentSchema = new mongoose_1.Schema({
    tutorId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    studentUserId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    seedKey: { type: String, required: true },
    sourcePage: { type: String, default: 'students' },
    name: { type: String, required: true },
    initials: { type: String, required: true },
    studentCode: { type: String, required: true },
    year: { type: Number, required: true },
    programme: { type: String, required: true },
    moduleCode: { type: String, required: true },
    status: { type: String, enum: ['review', 'graded', 'atRisk'], required: true },
    priority: { type: Number, default: 3 },
    workTitle: { type: String, required: true },
    taskLabel: { type: String },
    questionCount: { type: Number },
    pdfReady: { type: Boolean, default: false },
    score: { type: Number },
    maxScore: { type: Number, default: 100 },
    packsDownloaded: { type: Number, default: 0 },
    classRank: { type: Number },
    midtermPercent: { type: Number },
    feedbackSent: { type: Boolean, default: false },
    submittedAt: { type: Date },
    gradedAt: { type: Date },
}, { timestamps: true });
const packSchema = new mongoose_1.Schema({
    tutorId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    seedKey: { type: String, required: true },
    sourcePage: { type: String, default: 'packs' },
    title: { type: String, required: true },
    kind: { type: String, enum: ['mock', 'study', 'recovery'], required: true },
    assignedCount: { type: Number, default: 0 },
}, { timestamps: true });
workspaceSchema.index({ tutorId: 1, seedKey: 1 }, { unique: true });
studentSchema.index({ tutorId: 1, seedKey: 1 }, { unique: true });
packSchema.index({ tutorId: 1, seedKey: 1 }, { unique: true });
exports.TutorWorkspace = mongoose_1.default.model('TutorWorkspace', workspaceSchema);
exports.TutorStudent = mongoose_1.default.model('TutorStudent', studentSchema);
exports.TutorPack = mongoose_1.default.model('TutorPack', packSchema);

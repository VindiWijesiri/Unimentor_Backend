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
exports.CatalogMaterial = exports.AssessmentGrowth = exports.AssessmentAttempt = exports.AssessmentPaper = exports.ASSESSMENT_KINDS = void 0;
const mongoose_1 = __importStar(require("mongoose"));
exports.ASSESSMENT_KINDS = [
    'mcq',
    'true_false',
    'short_answer',
    'fill_blank',
    'matching',
    'ordering',
    'drag_drop',
    'essay',
    'coding',
    'file_project',
    'scenario',
];
const paperSchema = new mongoose_1.Schema({
    seedKey: { type: String, unique: true, sparse: true },
    tutorId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tutorName: { type: String, default: 'Tutor' },
    moduleCode: { type: String, required: true },
    moduleName: { type: String, required: true },
    title: { type: String, required: true },
    kind: { type: String, enum: exports.ASSESSMENT_KINDS, required: true },
    kindLabel: { type: String, required: true },
    marks: { type: Number, default: 10 },
    durationMin: { type: Number, default: 30 },
    chips: [{ type: String }],
    dueLabel: { type: String, default: '' },
    detail: { type: String, default: '' },
    status: {
        type: String,
        enum: ['draft', 'pending_review', 'published', 'changes_requested', 'closed'],
        default: 'draft',
    },
    reviewNote: { type: String, default: '' },
    urgent: { type: Boolean, default: false },
    gradesReleased: { type: Boolean, default: false },
    assignedStudentIds: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    questions: { type: mongoose_1.Schema.Types.Mixed, default: [] },
}, { timestamps: true });
const attemptSchema = new mongoose_1.Schema({
    paperId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'AssessmentPaper', required: true, index: true },
    studentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    answers: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    flagged: [{ type: String }],
    questionIndex: { type: Number, default: 0 },
    status: { type: String, enum: ['in_progress', 'submitted', 'graded'], default: 'in_progress' },
    score: { type: Number, default: null },
    maxScore: { type: Number, default: 0 },
    feedback: { type: String, default: '' },
    gradeLabel: { type: String, default: '' },
    breakdown: { type: mongoose_1.Schema.Types.Mixed, default: [] },
    progress: { type: Number, default: 0 },
    startedAt: { type: Date },
    submittedAt: { type: Date },
}, { timestamps: true });
attemptSchema.index({ paperId: 1, studentId: 1 }, { unique: true });
const growthSchema = new mongoose_1.Schema({
    studentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    semester: String,
    weekLabel: String,
    growth: String,
    growthDetail: String,
    cohortRank: String,
    stats: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    target: Number,
    modules: [String],
    points: { type: mongoose_1.Schema.Types.Mixed, default: [] },
    competencies: { type: mongoose_1.Schema.Types.Mixed, default: [] },
    timeline: { type: mongoose_1.Schema.Types.Mixed, default: [] },
    focus: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    momentum: { type: mongoose_1.Schema.Types.Mixed, default: {} },
}, { timestamps: true });
const catalogSchema = new mongoose_1.Schema({
    seedKey: { type: String, unique: true },
    moduleCode: String,
    badge: String,
    title: String,
    author: String,
    priceLabel: String,
    strike: String,
    meta: String,
    tier: { type: String, enum: ['premium', 'free', 'deal', 'community'], default: 'free' },
    detail: String,
}, { timestamps: true });
exports.AssessmentPaper = mongoose_1.default.model('AssessmentPaper', paperSchema);
exports.AssessmentAttempt = mongoose_1.default.model('AssessmentAttempt', attemptSchema);
exports.AssessmentGrowth = mongoose_1.default.model('AssessmentGrowth', growthSchema);
exports.CatalogMaterial = mongoose_1.default.model('CatalogMaterial', catalogSchema);

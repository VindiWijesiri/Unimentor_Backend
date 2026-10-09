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
exports.ChatPodMessage = exports.Discussion = exports.Assessment = exports.StudyMaterial = exports.StudyPlan = exports.LearningActivity = exports.StudyGoal = exports.StudyWeek = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const studyWeekSchema = new mongoose_1.Schema({
    studentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    seedKey: { type: String, required: true },
    sourcePage: { type: String, default: 'plans' },
    hoursGoal: { type: Number, required: true },
    days: [{ day: String, hours: Number }],
}, { timestamps: true });
const studyGoalSchema = new mongoose_1.Schema({
    studentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    seedKey: { type: String, required: true },
    sourcePage: { type: String, default: 'plans' },
    title: { type: String, required: true },
    dueLabel: { type: String, required: true },
    current: { type: Number, default: 0 },
    total: { type: Number, default: 1 },
    tag: { type: String, default: '' },
    completed: { type: Boolean, default: false },
}, { timestamps: true });
const learningActivitySchema = new mongoose_1.Schema({
    studentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    seedKey: { type: String, required: true },
    sourcePage: { type: String, default: 'activity' },
    moduleCode: { type: String, required: true },
    moduleName: { type: String, required: true },
    topic: { type: String, required: true },
    activityType: { type: String, required: true },
    done: { type: Number, default: 0 },
    total: { type: Number, default: 1 },
    minutesLeft: { type: Number, default: 0 },
}, { timestamps: true });
const studyPlanSchema = new mongoose_1.Schema({
    studentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    seedKey: { type: String, required: true },
    sourcePage: { type: String, default: 'plans' },
    title: { type: String, required: true },
    moduleCode: { type: String, required: true },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['active', 'upcoming', 'done'], default: 'active' },
    progress: { type: Number, default: 0 },
}, { timestamps: true });
const studyMaterialSchema = new mongoose_1.Schema({
    studentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    seedKey: { type: String, required: true },
    sourcePage: { type: String, default: 'materials' },
    title: { type: String, required: true },
    kind: { type: String, enum: ['pdf', 'set', 'notes'], default: 'pdf' },
    sourceLabel: { type: String, required: true },
    sourceType: { type: String, enum: ['group', 'session'], required: true },
    uploadedAt: { type: Date, default: Date.now },
}, { timestamps: true });
const assessmentSchema = new mongoose_1.Schema({
    studentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    seedKey: { type: String, required: true },
    sourcePage: { type: String, default: 'assessments' },
    type: { type: String, enum: ['exam', 'assignment'], required: true },
    title: { type: String, required: true },
    subject: { type: String, required: true },
    scheduledAt: { type: Date },
    dueDate: { type: Date },
    durationMin: { type: Number },
    marks: { type: Number },
    status: { type: String, enum: ['upcoming', 'open', 'submitted'], default: 'upcoming' },
}, { timestamps: true });
const discussionSchema = new mongoose_1.Schema({
    studentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    seedKey: { type: String, required: true },
    sourcePage: { type: String, default: 'discussions' },
    title: { type: String, required: true },
    group: { type: String, required: true },
    authorName: { type: String, required: true },
    authorInitials: { type: String, required: true },
    preview: { type: String, required: true },
    votes: { type: Number, default: 0 },
    joined: { type: Boolean, default: false },
}, { timestamps: true });
const chatPodMessageSchema = new mongoose_1.Schema({
    studentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    seedKey: { type: String, required: true },
    sourcePage: { type: String, default: 'chatPod' },
    authorName: { type: String, required: true },
    authorInitials: { type: String, required: true },
    text: { type: String, required: true },
    unread: { type: Boolean, default: true },
}, { timestamps: true });
studyWeekSchema.index({ studentId: 1, seedKey: 1 }, { unique: true });
studyGoalSchema.index({ studentId: 1, seedKey: 1 }, { unique: true });
learningActivitySchema.index({ studentId: 1, seedKey: 1 }, { unique: true });
studyPlanSchema.index({ studentId: 1, seedKey: 1 }, { unique: true });
studyMaterialSchema.index({ studentId: 1, seedKey: 1 }, { unique: true });
assessmentSchema.index({ studentId: 1, seedKey: 1 }, { unique: true });
discussionSchema.index({ studentId: 1, seedKey: 1 }, { unique: true });
chatPodMessageSchema.index({ studentId: 1, seedKey: 1 }, { unique: true });
exports.StudyWeek = mongoose_1.default.model('StudyWeek', studyWeekSchema);
exports.StudyGoal = mongoose_1.default.model('StudyGoal', studyGoalSchema);
exports.LearningActivity = mongoose_1.default.model('LearningActivity', learningActivitySchema);
exports.StudyPlan = mongoose_1.default.model('StudyPlan', studyPlanSchema);
exports.StudyMaterial = mongoose_1.default.model('StudyMaterial', studyMaterialSchema);
exports.Assessment = mongoose_1.default.model('Assessment', assessmentSchema);
exports.Discussion = mongoose_1.default.model('Discussion', discussionSchema);
exports.ChatPodMessage = mongoose_1.default.model('ChatPodMessage', chatPodMessageSchema);

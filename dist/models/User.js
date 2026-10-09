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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const enrolledModuleSchema = new mongoose_1.Schema({
    code: { type: String, required: true },
    name: { type: String, required: true },
    credits: { type: Number, default: 3 },
    faculty: { type: String },
    department: { type: String },
    progress: { type: Number, default: 50 },
    status: { type: String, default: 'active' },
    nextSession: { type: String },
    mentor: {
        id: { type: String },
        name: { type: String, default: 'Unassigned Mentor' },
        roleTitle: { type: String, default: 'Peer Mentor' },
        batch: { type: String, default: "Batch '24" },
        rating: { type: Number, default: 4.8 },
        reviewCount: { type: Number, default: 20 },
        avatar: { type: String },
        isVerified: { type: Boolean, default: true },
        activeStudentsCount: { type: Number, default: 15 },
        hourlyRate: { type: Number, default: 1800 },
    },
}, { _id: false });
const shortlistedMentorSchema = new mongoose_1.Schema({
    mentorId: { type: String, required: true },
    name: { type: String, required: true },
    avatar: { type: String },
    hourlyRate: { type: Number, default: 2000 },
    rating: { type: Number, default: 4.8 },
    subjects: [{ type: String }],
    priority: { type: String, enum: ['Top Choice', 'Considering', 'Backup'], default: 'Considering' },
    notes: { type: String, default: '' },
    savedAt: { type: Date, default: Date.now },
}, { _id: false });
const userSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ['student', 'mentor', 'admin', 'lic'], required: true },
    profilePicture: { type: String },
    bio: { type: String },
    subjects: [{ type: String }],
    degreeProgramme: { type: String, default: 'BSc (Hons) Software Engineering' },
    academicYear: { type: String, default: 'Year 3' },
    semester: { type: String, default: 'Sem 2' },
    academicStats: {
        goals: { type: Number, default: 4 },
        plans: { type: Number, default: 3 },
        dueTests: { type: Number, default: 2 },
        done: { type: Number, default: 18 },
    },
    enrolledModules: [enrolledModuleSchema],
    shortlistedMentors: [shortlistedMentorSchema],
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    hourlyRate: { type: Number, default: 1800 },
    experience: { type: String, default: 'Verified Senior Mentor' },
    sessionCount: { type: Number, default: 14 },
    availability: { type: String, default: 'Weekdays & Weekends' },
    qualification: { type: String, default: 'Undergraduate Teaching Assistant' },
    languages: [{ type: String, default: 'English' }],
    teachingMode: { type: String, default: 'Online / Hybrid' },
    lessonTypes: [{ type: String, default: 'Individual' }],
    campusId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Campus' },
    university: { type: String },
    faculty: { type: String },
    department: { type: String },
    studentId: { type: String },
    phone: { type: String },
    accountStatus: {
        type: String,
        enum: ['active', 'pending', 'under_review', 'suspended', 'rejected', 'expired'],
        default: 'active',
    },
    isVerified: { type: Boolean, default: false },
    verificationStatus: {
        type: String,
        enum: ['unverified', 'pending', 'under_review', 'verified', 'approved', 'rejected'],
        default: 'unverified',
    },
    faceVerifiedAt: { type: Date },
    idPhoto: { type: String },
    referenceFaceImage: { type: String },
    passwordResetCode: { type: String },
    passwordResetExpires: { type: Date },
    passwordResetVerified: { type: Boolean, default: false },
    loginCode: { type: String },
    loginCodeExpires: { type: Date },
    tokenVersion: { type: Number, default: 0 },
    twoFactorEnabled: { type: Boolean, default: false },
    biometricEnabled: { type: Boolean, default: false },
    notificationPrefs: {
        sessionReminders: { type: Boolean, default: true },
        chatMessages: { type: Boolean, default: true },
        bookingUpdates: { type: Boolean, default: true },
        verificationAlerts: { type: Boolean, default: true },
        semesterRenewals: { type: Boolean, default: true },
        facultyNews: { type: Boolean, default: false },
    },
}, { timestamps: true });
// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password'))
        return next();
    this.password = await bcryptjs_1.default.hash(this.password, 12);
    next();
});
// Compare plain password with stored hash
userSchema.methods.comparePassword = function (candidate) {
    return bcryptjs_1.default.compare(candidate, this.password);
};
// Never expose password in JSON responses
userSchema.set('toJSON', {
    transform: (_doc, ret) => {
        const hidden = ret;
        delete hidden.password;
        delete hidden.loginCode;
        delete hidden.loginCodeExpires;
        delete hidden.passwordResetCode;
        delete hidden.passwordResetExpires;
        delete hidden.idPhoto;
        delete hidden.referenceFaceImage;
        return ret;
    },
});
exports.default = mongoose_1.default.model('User', userSchema);

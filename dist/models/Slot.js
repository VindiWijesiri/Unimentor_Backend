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
const mongoose_1 = __importStar(require("mongoose"));
const registeredAttendeeSchema = new mongoose_1.Schema({
    studentId: { type: mongoose_1.Schema.Types.Mixed },
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
}, { _id: true });
const slotSchema = new mongoose_1.Schema({
    mentorId: { type: mongoose_1.Schema.Types.Mixed, required: true },
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
}, { timestamps: true });
exports.default = mongoose_1.default.model('Slot', slotSchema);

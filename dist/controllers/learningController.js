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
exports.getDashboard = getDashboard;
exports.getPlans = getPlans;
exports.getMaterials = getMaterials;
exports.getMaterial = getMaterial;
exports.getAssessments = getAssessments;
exports.getAssessment = getAssessment;
exports.submitAssessment = submitAssessment;
exports.getDiscussions = getDiscussions;
exports.joinDiscussion = joinDiscussion;
exports.getChatPod = getChatPod;
exports.postChatPod = postChatPod;
exports.logPresence = logPresence;
exports.logFocus = logFocus;
exports.updateWeeklyGoal = updateWeeklyGoal;
exports.toggleGoal = toggleGoal;
exports.progressActivity = progressActivity;
exports.getLearningSessions = getLearningSessions;
const mongoose_1 = __importDefault(require("mongoose"));
const Session_1 = __importDefault(require("../models/Session"));
const User_1 = __importDefault(require("../models/User"));
const learning_1 = require("../models/learning");
const pod_1 = require("../models/pod");
const library_1 = require("../models/library");
const seedLearningData_1 = require("../services/seedLearningData");
const goalPlanController_1 = require("./goalPlanController");
const studyPresence_1 = require("../services/studyPresence");
const seedPodData_1 = require("../services/seedPodData");
const seedLibraryData_1 = require("../services/seedLibraryData");
function timeAgo(date) {
    const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
    if (minutes < 60)
        return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24)
        return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
}
function unreadCount(conversation, userId) {
    const counts = conversation.unreadCounts;
    if (counts instanceof Map)
        return counts.get(userId) ?? 0;
    return counts?.[userId] ?? 0;
}
function clock(date) {
    if (!date)
        return '';
    return new Date(date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
async function readyStudent(req) {
    const studentId = String(req.userId);
    if (req.userRole === 'student') {
        await Promise.all([(0, seedLearningData_1.seedLearningData)(studentId), (0, seedPodData_1.seedPodData)(studentId)]);
        await (0, seedLibraryData_1.seedLibraryData)(studentId);
    }
    return studentId;
}
async function getDashboard(req, res, next) {
    try {
        const studentId = await readyStudent(req);
        const user = await User_1.default.findById(studentId);
        const [week, goals, activity, sessions, discussions, assessments, materials, podConversations] = await Promise.all([
            (0, studyPresence_1.weekSummary)(studentId),
            learning_1.StudyGoal.find({ studentId }).sort({ createdAt: 1 }).limit(8).lean(),
            learning_1.LearningActivity.findOne({ studentId }).sort({ updatedAt: -1 }).lean(),
            Session_1.default.find({ studentId }).populate('mentorId', 'name').sort({ scheduledAt: 1 }).limit(6).lean(),
            learning_1.Discussion.find({ studentId }).sort({ createdAt: -1 }).limit(6).lean(),
            learning_1.Assessment.find({ studentId }).sort({ scheduledAt: 1, dueDate: 1 }).limit(6).lean(),
            library_1.LibraryMaterial.find({
                seedKey: { $exists: false },
                $or: [{ owner: studentId }, { savedBy: studentId }],
            })
                .select('title kind moduleName moduleCode source createdAt')
                .sort({ createdAt: -1 })
                .limit(6)
                .lean(),
            pod_1.PodConversation.find({ participants: studentId })
                .select('type category title lastMessageText lastSenderName lastMessageAt unreadCounts participants meta seedKey')
                .sort({ lastMessageAt: -1 })
                .lean(),
        ]);
        const unreadChat = podConversations.reduce((sum, item) => sum + unreadCount(item, studentId), 0);
        const featured = podConversations.filter((item) => item.seedKey === 'pod-dsa-squad' || item.category === 'kuppiya').slice(0, 2);
        const podItems = (featured.length ? featured : podConversations.slice(0, 2)).map((item) => ({
            _id: item._id,
            type: item.type,
            category: item.category,
            title: item.title,
            lastMessageText: item.lastMessageText,
            lastSenderName: item.lastSenderName,
            lastMessageAt: item.lastMessageAt,
            timeLabel: item.type === 'group' ? clock(item.lastMessageAt) : timeAgo(item.lastMessageAt),
            unreadCount: unreadCount(item, studentId),
            participantCount: item.participants?.length ?? 0,
            meta: item.meta ?? {},
        }));
        const days = week.days.map((day) => ({ day: day.day, hours: day.hours }));
        const done = week.hoursDone;
        const goal = week.hoursGoal;
        const plannedGoals = await (0, goalPlanController_1.goalSummaries)(studentId);
        const live = sessions.find((session) => session.isLive);
        const upcoming = sessions.filter((session) => !session.isLive).slice(0, 2);
        const mentorName = live?.mentorId?.name;
        res.json({
            header: {
                unreadChat,
                initials: (user?.name ?? 'S').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
            },
            weeklyStudy: {
                hoursDone: done,
                hoursGoal: goal,
                percent: goal ? Math.round((done / goal) * 1000) / 10 : 0,
                hoursLeft: Math.max(0, Math.round((goal - done) * 10) / 10),
                days,
            },
            todayGoals: plannedGoals.length ? plannedGoals : goals.map((item) => ({
                _id: item._id,
                title: item.title,
                dueLabel: item.dueLabel,
                current: item.current,
                total: item.total,
                completed: item.completed,
            })),
            continueActivity: activity && {
                _id: activity._id,
                moduleCode: activity.moduleCode,
                moduleName: activity.moduleName,
                topic: activity.topic,
                activityType: activity.activityType,
                done: activity.done,
                total: activity.total,
                minutesLeft: activity.minutesLeft,
                percent: Math.round((activity.done / activity.total) * 100),
            },
            sessions: {
                total: sessions.length,
                live: live && {
                    _id: live._id,
                    type: 'Tutoring',
                    title: live.subject,
                    tutorName: mentorName ?? 'Tutor',
                    minutesLeft: live.durationMin ?? 0,
                    moduleCode: live.moduleCode,
                },
                upcoming: upcoming.map((session) => ({
                    _id: session._id,
                    title: session.subject,
                    moduleCode: session.moduleCode,
                    scheduledAt: session.scheduledAt,
                })),
            },
            discussions: {
                total: discussions.length,
                items: discussions.map((item) => ({
                    _id: item._id,
                    title: item.title,
                    group: item.group,
                    authorName: item.authorName,
                    authorInitials: item.authorInitials,
                    preview: item.preview,
                    votes: item.votes,
                    joined: item.joined,
                    timeAgo: timeAgo(item.createdAt),
                })),
            },
            assessments: {
                dueSoon: assessments.filter((item) => item.status !== 'submitted').length,
                items: assessments.map((item) => ({
                    _id: item._id,
                    type: item.type,
                    title: item.title,
                    subject: item.subject,
                    scheduledAt: item.scheduledAt,
                    dueDate: item.dueDate,
                    durationMin: item.durationMin,
                    marks: item.marks,
                    status: item.status,
                })),
            },
            materials: materials.map((item) => ({
                _id: String(item._id),
                title: item.title,
                kind: item.kind === 'pdf' || item.kind === 'code' ? item.kind === 'code' ? 'set' : 'pdf' : 'notes',
                sourceLabel: item.moduleName || item.moduleCode || 'Library',
                sourceType: item.source === 'group' ? 'group' : 'session',
                uploadedAt: item.createdAt,
            })),
            podFeed: {
                total: podConversations.length,
                unread: unreadChat,
                items: podItems,
            },
        });
    }
    catch (err) {
        next(err);
    }
}
async function getPlans(req, res, next) {
    try {
        const studentId = await readyStudent(req);
        const plans = await learning_1.StudyPlan.find({ studentId }).sort({ dueDate: 1 });
        res.json(plans);
    }
    catch (err) {
        next(err);
    }
}
async function getMaterials(req, res, next) {
    try {
        const studentId = await readyStudent(req);
        const materials = await learning_1.StudyMaterial.find({ studentId }).sort({ uploadedAt: -1 });
        res.json(materials);
    }
    catch (err) {
        next(err);
    }
}
async function getMaterial(req, res, next) {
    try {
        const studentId = await readyStudent(req);
        const material = await learning_1.StudyMaterial.findOne({ _id: req.params.id, studentId });
        if (!material) {
            res.status(404).json({ message: 'Study material not found.' });
            return;
        }
        res.json(material);
    }
    catch (err) {
        next(err);
    }
}
async function getAssessments(req, res, next) {
    try {
        const studentId = await readyStudent(req);
        const assessments = await learning_1.Assessment.find({ studentId }).sort({ scheduledAt: 1, dueDate: 1 });
        res.json(assessments);
    }
    catch (err) {
        next(err);
    }
}
async function getAssessment(req, res, next) {
    try {
        const studentId = await readyStudent(req);
        const assessment = await learning_1.Assessment.findOne({ _id: req.params.id, studentId });
        if (!assessment) {
            res.status(404).json({ message: 'Assessment not found.' });
            return;
        }
        res.json(assessment);
    }
    catch (err) {
        next(err);
    }
}
async function submitAssessment(req, res, next) {
    try {
        const studentId = await readyStudent(req);
        const assessment = await learning_1.Assessment.findOneAndUpdate({ _id: req.params.id, studentId }, { status: 'submitted' }, { new: true });
        if (!assessment) {
            res.status(404).json({ message: 'Assessment not found.' });
            return;
        }
        res.json(assessment);
    }
    catch (err) {
        next(err);
    }
}
async function getDiscussions(req, res, next) {
    try {
        const studentId = await readyStudent(req);
        const discussions = await learning_1.Discussion.find({ studentId }).sort({ createdAt: -1 });
        res.json(discussions);
    }
    catch (err) {
        next(err);
    }
}
async function joinDiscussion(req, res, next) {
    try {
        const studentId = await readyStudent(req);
        const discussion = await learning_1.Discussion.findOneAndUpdate({ _id: req.params.id, studentId }, { $set: { joined: true }, $inc: { votes: 1 } }, { new: true });
        if (!discussion) {
            res.status(404).json({ message: 'Discussion not found.' });
            return;
        }
        res.json(discussion);
    }
    catch (err) {
        next(err);
    }
}
async function getChatPod(req, res, next) {
    try {
        const studentId = await readyStudent(req);
        const messages = await learning_1.ChatPodMessage.find({ studentId }).sort({ createdAt: 1 });
        await learning_1.ChatPodMessage.updateMany({ studentId, unread: true }, { unread: false });
        res.json(messages);
    }
    catch (err) {
        next(err);
    }
}
async function postChatPod(req, res, next) {
    try {
        const studentId = await readyStudent(req);
        const user = await User_1.default.findById(studentId);
        const text = String(req.body.text ?? '').trim();
        if (!text) {
            res.status(400).json({ message: 'Message text is required.' });
            return;
        }
        const message = await learning_1.ChatPodMessage.create({
            studentId,
            seedKey: `live-${Date.now()}`,
            sourcePage: 'chatPod',
            authorName: user?.name ?? 'You',
            authorInitials: (user?.name ?? 'Y').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
            text,
            unread: false,
        });
        res.status(201).json(message);
    }
    catch (err) {
        next(err);
    }
}
async function logPresence(req, res, next) {
    try {
        const studentId = await readyStudent(req);
        const seconds = Number(req.body.seconds);
        const date = String(req.body.date ?? '');
        if (!Number.isFinite(seconds) || seconds < 0) {
            res.status(400).json({ message: 'Seconds are required.' });
            return;
        }
        const week = await (0, studyPresence_1.addOpenSeconds)(studentId, seconds, date);
        res.json(week);
    }
    catch (err) {
        next(err);
    }
}
async function logFocus(req, res, next) {
    try {
        const studentId = await readyStudent(req);
        const seconds = Math.round(Number(req.body.seconds));
        const goalId = String(req.body.goalId || '');
        const date = String(req.body.date || '');
        if (!mongoose_1.default.isValidObjectId(goalId) || !Number.isFinite(seconds) || seconds < 30 || seconds > 10800) {
            res.status(400).json({ message: 'Choose a goal and a focus length.' });
            return;
        }
        const area = String(req.body.area || '').slice(0, 80);
        const result = await (0, studyPresence_1.logFocusSession)(studentId, goalId, seconds, date, area);
        if (!result) {
            res.status(404).json({ message: 'Goal not found.' });
            return;
        }
        const weekly = result.goal.seedKey === 'goal-weekly';
        res.json({
            minutes: Math.max(1, Math.round(seconds / 60)),
            goalTitle: result.goal.title,
            progress: weekly ? Math.min(100, Math.round(result.summary.percent)) : result.goal.progress,
            hoursDone: result.summary.hoursDone,
        });
    }
    catch (err) {
        next(err);
    }
}
async function updateWeeklyGoal(req, res, next) {
    try {
        const studentId = await readyStudent(req);
        const hoursGoal = Number(req.body.hoursGoal);
        if (!Number.isFinite(hoursGoal)) {
            res.status(400).json({ message: 'Weekly hours goal is required.' });
            return;
        }
        const week = await (0, studyPresence_1.setWeeklyHoursGoal)(studentId, hoursGoal);
        res.json(week);
    }
    catch (err) {
        next(err);
    }
}
async function toggleGoal(req, res, next) {
    try {
        const studentId = await readyStudent(req);
        const { GoalPlan } = await Promise.resolve().then(() => __importStar(require('../models/goalPlan')));
        const planned = await GoalPlan.findOne({ _id: req.params.id, studentId });
        if (planned) {
            planned.completed = !planned.completed;
            planned.progress = planned.completed ? 100 : Math.min(planned.progress, 99);
            await planned.save();
            res.json(planned);
            return;
        }
        const goal = await learning_1.StudyGoal.findOne({ _id: req.params.id, studentId });
        if (!goal) {
            res.status(404).json({ message: 'Goal not found.' });
            return;
        }
        goal.completed = !goal.completed;
        goal.current = goal.completed ? goal.total : Math.max(0, goal.total - 1);
        await goal.save();
        res.json(goal);
    }
    catch (err) {
        next(err);
    }
}
async function progressActivity(req, res, next) {
    try {
        const studentId = await readyStudent(req);
        const activity = await learning_1.LearningActivity.findOne({ _id: req.params.id, studentId });
        if (!activity) {
            res.status(404).json({ message: 'Activity not found.' });
            return;
        }
        if (activity.done < activity.total) {
            activity.done += 1;
            activity.minutesLeft = Math.max(0, activity.minutesLeft - 3);
            await activity.save();
        }
        res.json(activity);
    }
    catch (err) {
        next(err);
    }
}
async function getLearningSessions(req, res, next) {
    try {
        const studentId = await readyStudent(req);
        const sessions = await Session_1.default.find({ studentId })
            .populate('mentorId', 'name email')
            .sort({ scheduledAt: 1 });
        res.json(sessions);
    }
    catch (err) {
        next(err);
    }
}

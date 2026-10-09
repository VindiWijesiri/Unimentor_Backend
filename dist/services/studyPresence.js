"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDateKey = parseDateKey;
exports.mondayKey = mondayKey;
exports.weekSummary = weekSummary;
exports.addOpenSeconds = addOpenSeconds;
exports.logFocusSession = logFocusSession;
exports.setWeeklyHoursGoal = setWeeklyHoursGoal;
const goalPlan_1 = require("../models/goalPlan");
const studyPresence_1 = require("../models/studyPresence");
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
function dateKey(year, month, day) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
function parseDateKey(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match)
        return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day)
        return null;
    return date;
}
function mondayKey(date) {
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const weekday = copy.getDay();
    const diff = weekday === 0 ? -6 : 1 - weekday;
    copy.setDate(copy.getDate() + diff);
    return dateKey(copy.getFullYear(), copy.getMonth() + 1, copy.getDate());
}
function buildDays(weekStart) {
    const start = parseDateKey(weekStart);
    if (!start)
        return [];
    return DAY_LETTERS.map((day, index) => {
        const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
        return {
            date: dateKey(date.getFullYear(), date.getMonth() + 1, date.getDate()),
            day,
            seconds: 0,
        };
    });
}
function summarize(doc) {
    const today = new Date();
    const todayKey = dateKey(today.getFullYear(), today.getMonth() + 1, today.getDate());
    const hoursGoal = doc.hoursGoal > 0 ? doc.hoursGoal : 20;
    const days = doc.days.map((day) => {
        const parsed = parseDateKey(day.date);
        const hours = Math.round((day.seconds / 3600) * 10) / 10;
        const state = day.date === todayKey
            ? 'today'
            : day.date < todayKey
                ? 'done'
                : 'open';
        return {
            day: day.day,
            date: day.date,
            dateNumber: parsed?.getDate() ?? 0,
            hours,
            state,
        };
    });
    const hoursDone = Math.round(days.reduce((sum, day) => sum + day.hours, 0) * 10) / 10;
    const percent = Math.round((hoursDone / hoursGoal) * 1000) / 10;
    return {
        weekStart: doc.weekStart,
        hoursGoal,
        hoursDone,
        percent,
        hoursLeft: Math.max(0, Math.round((hoursGoal - hoursDone) * 10) / 10),
        days,
    };
}
async function currentWeek(studentId, date) {
    const weekStart = mondayKey(date);
    const existing = await studyPresence_1.StudyPresence.findOne({ studentId, weekStart });
    if (existing)
        return existing;
    try {
        return await studyPresence_1.StudyPresence.create({
            studentId,
            weekStart,
            hoursGoal: 20,
            days: buildDays(weekStart),
        });
    }
    catch (err) {
        const duplicate = await studyPresence_1.StudyPresence.findOne({ studentId, weekStart });
        if (duplicate)
            return duplicate;
        throw err;
    }
}
async function syncWeeklyGoal(studentId, summary) {
    const goal = await goalPlan_1.GoalPlan.findOne({ studentId, seedKey: 'goal-weekly' });
    if (!goal)
        return;
    const progress = Math.min(100, Math.round(summary.percent));
    goal.progress = progress;
    goal.hoursLogged = summary.hoursDone;
    goal.targetPercent = summary.hoursGoal;
    goal.targetGrade = `${summary.hoursGoal}h`;
    goal.gradeLabel = `${summary.hoursDone}h`;
    goal.completed = summary.hoursDone >= summary.hoursGoal;
    goal.dueLabel = 'This week';
    goal.delta = `${summary.hoursLeft}h left`;
    await goal.save();
}
async function weekSummary(studentId, date = new Date()) {
    const doc = await currentWeek(studentId, date);
    const summary = summarize(doc);
    await syncWeeklyGoal(studentId, summary);
    return summary;
}
async function addOpenSeconds(studentId, seconds, dateKeyValue) {
    const safeSeconds = Math.min(10800, Math.max(0, Math.round(seconds)));
    const date = parseDateKey(dateKeyValue) ?? new Date();
    const doc = await currentWeek(studentId, date);
    if (safeSeconds > 0) {
        const key = dateKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
        doc.days = doc.days.map((day) => ({
            date: day.date,
            day: day.day,
            seconds: day.date === key ? day.seconds + safeSeconds : day.seconds,
        }));
        await doc.save();
    }
    const summary = summarize(doc);
    await syncWeeklyGoal(studentId, summary);
    return summary;
}
async function logFocusSession(studentId, goalId, seconds, dateKeyValue, areaLabel = '') {
    const goal = await goalPlan_1.GoalPlan.findOne({ _id: goalId, studentId });
    if (!goal)
        return null;
    const summary = await addOpenSeconds(studentId, seconds, dateKeyValue);
    if (goal.seedKey !== 'goal-weekly') {
        const hours = Math.round((seconds / 3600) * 10) / 10;
        goal.hoursLogged = Math.round(((goal.hoursLogged || 0) + hours) * 10) / 10;
        const bump = Math.max(1, Math.round(seconds / 60 / 10));
        goal.progress = Math.min(100, (goal.progress || 0) + bump);
        const place = areaLabel && areaLabel !== 'Whole goal' ? `${areaLabel} · ` : '';
        goal.delta = `${place}${goal.hoursLogged}h focused`;
        if (goal.progress >= 100)
            goal.completed = true;
        await goal.save();
    }
    const fresh = await goalPlan_1.GoalPlan.findOne({ _id: goalId, studentId });
    return { summary, goal: fresh ?? goal };
}
async function setWeeklyHoursGoal(studentId, hoursGoal) {
    const nextGoal = Math.min(60, Math.max(1, Math.round(hoursGoal)));
    const doc = await currentWeek(studentId, new Date());
    doc.hoursGoal = nextGoal;
    await doc.save();
    const summary = summarize(doc);
    await syncWeeklyGoal(studentId, summary);
    return summary;
}

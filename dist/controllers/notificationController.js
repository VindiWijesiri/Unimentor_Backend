"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listNotifications = listNotifications;
exports.markNotificationRead = markNotificationRead;
const Notification_1 = __importDefault(require("../models/Notification"));
async function listNotifications(req, res, next) {
    try {
        const items = await Notification_1.default.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(40);
        res.json(items);
    }
    catch (err) {
        next(err);
    }
}
async function markNotificationRead(req, res, next) {
    try {
        const item = await Notification_1.default.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, { read: true }, { new: true });
        if (!item) {
            res.status(404).json({ message: 'Alert not found.' });
            return;
        }
        res.json(item);
    }
    catch (err) {
        next(err);
    }
}

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notify = notify;
const mongoose_1 = __importDefault(require("mongoose"));
const Notification_1 = __importDefault(require("../models/Notification"));
async function notify(userId, input) {
    if (!userId || !mongoose_1.default.isValidObjectId(String(userId)))
        return;
    await Notification_1.default.create({
        userId,
        kind: input.kind,
        title: input.title,
        body: input.body,
        refId: input.refId,
    });
}

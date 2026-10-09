"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMyPayments = listMyPayments;
const Payment_1 = __importDefault(require("../models/Payment"));
async function listMyPayments(req, res, next) {
    try {
        const field = req.userRole === 'mentor' ? 'mentorId' : 'studentId';
        const items = await Payment_1.default.find({ [field]: req.userId })
            .populate('studentId', 'name')
            .populate('mentorId', 'name')
            .sort({ createdAt: -1 });
        const totalLkr = items.reduce((sum, item) => sum + item.amountLkr, 0);
        res.json({ totalLkr, items });
    }
    catch (err) {
        next(err);
    }
}

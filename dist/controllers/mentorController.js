"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchMentors = searchMentors;
exports.getMentorById = getMentorById;
const User_1 = __importDefault(require("../models/User"));
async function searchMentors(req, res, next) {
    try {
        const q = req.query.q ?? '';
        const priceRange = req.query.priceRange;
        const minRating = req.query.minRating ? Number(req.query.minRating) : undefined;
        const regex = new RegExp(q, 'i');
        const filter = {
            role: 'mentor',
        };
        if (q.trim()) {
            filter.$or = [{ name: regex }, { subjects: regex }, { bio: regex }];
        }
        if (priceRange === '500-3000') {
            filter.hourlyRate = { $gte: 500, $lte: 3000 };
        }
        else if (priceRange === '3000-5000') {
            filter.hourlyRate = { $gt: 3000, $lte: 5000 };
        }
        if (minRating) {
            filter.rating = { $gte: minRating };
        }
        const totalMentors = await User_1.default.countDocuments({ role: 'mentor' });
        console.log(`🔍 [mentorController.searchMentors] Query: "${q}" | PriceRange: ${priceRange ?? 'any'} | MinRating: ${minRating ?? 'any'}`);
        const mentors = await User_1.default.find(filter).select('-password');
        console.log(`   Matched mentors count: ${mentors.length} / ${totalMentors}`);
        if (mentors.length > 0) {
            console.log(`   Names:`, mentors.map((m) => `${m.name} (LKR ${m.hourlyRate ?? 1500}/hr)`).join(', '));
        }
        else {
            console.log(`   ⚠️ 0 mentors matched query.`);
        }
        res.json(mentors);
    }
    catch (err) {
        console.error('❌ [mentorController.searchMentors] Error:', err);
        next(err);
    }
}
async function getMentorById(req, res, next) {
    try {
        const mentor = await User_1.default.findOne({ _id: req.params.id, role: 'mentor' }).select('-password');
        if (!mentor) {
            res.status(404).json({ message: 'Mentor not found.' });
            return;
        }
        res.json(mentor);
    }
    catch (err) {
        next(err);
    }
}

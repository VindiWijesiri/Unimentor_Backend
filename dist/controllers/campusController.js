"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCampus = registerCampus;
exports.listCampuses = listCampuses;
exports.getCampus = getCampus;
exports.getMyCampus = getMyCampus;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Campus_1 = __importDefault(require("../models/Campus"));
const User_1 = __importDefault(require("../models/User"));
function signToken(id, role) {
    const secret = process.env.JWT_SECRET ?? 'changeme';
    return jsonwebtoken_1.default.sign({ id, role }, secret, {
        expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    });
}
function parseFaculties(value) {
    if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
        return value.split(/[,|]/).map((item) => item.trim()).filter(Boolean);
    }
    return [];
}
async function registerCampus(req, res, next) {
    try {
        const { name, shortCode, city, country, address, website, faculties, adminName, adminEmail, adminPassword, adminPhone, } = req.body;
        if (!name || !shortCode || !city || !adminName || !adminEmail || !adminPassword) {
            res.status(400).json({ message: 'Campus name, code, city, and admin name, email, and password are required.' });
            return;
        }
        const code = String(shortCode).trim().toUpperCase();
        const email = String(adminEmail).trim().toLowerCase();
        const [existingCampus, existingUser] = await Promise.all([
            Campus_1.default.findOne({ shortCode: code }),
            User_1.default.findOne({ email }),
        ]);
        if (existingCampus) {
            res.status(409).json({ message: 'A campus with this code is already registered.' });
            return;
        }
        if (existingUser) {
            res.status(409).json({ message: 'That admin email is already registered.' });
            return;
        }
        const campus = await Campus_1.default.create({
            name: String(name).trim(),
            shortCode: code,
            city: String(city).trim(),
            country: String(country ?? 'Sri Lanka').trim(),
            address: address ? String(address).trim() : undefined,
            website: website ? String(website).trim() : undefined,
            faculties: parseFaculties(faculties),
            contactName: String(adminName).trim(),
            contactEmail: email,
            contactPhone: adminPhone ? String(adminPhone).trim() : undefined,
            status: 'approved',
        });
        const user = await User_1.default.create({
            name: String(adminName).trim(),
            email,
            password: String(adminPassword),
            role: 'admin',
            campusId: campus._id,
        });
        campus.adminUser = user._id;
        await campus.save();
        const token = signToken(String(user._id), user.role);
        res.status(201).json({ campus, user, token });
    }
    catch (error) {
        next(error);
    }
}
async function listCampuses(_req, res, next) {
    try {
        const campuses = await Campus_1.default.find({ status: 'approved' })
            .select('name shortCode city country faculties website')
            .sort({ name: 1 })
            .lean();
        res.json(campuses);
    }
    catch (error) {
        next(error);
    }
}
async function getCampus(req, res, next) {
    try {
        const campus = await Campus_1.default.findById(req.params.id);
        if (!campus) {
            res.status(404).json({ message: 'Campus not found.' });
            return;
        }
        res.json(campus);
    }
    catch (error) {
        next(error);
    }
}
async function getMyCampus(req, res, next) {
    try {
        const user = await User_1.default.findById(req.userId).select('campusId role');
        if (!user?.campusId) {
            res.status(404).json({ message: 'No campus is linked to this account.' });
            return;
        }
        const campus = await Campus_1.default.findById(user.campusId);
        if (!campus) {
            res.status(404).json({ message: 'Campus not found.' });
            return;
        }
        res.json(campus);
    }
    catch (error) {
        next(error);
    }
}

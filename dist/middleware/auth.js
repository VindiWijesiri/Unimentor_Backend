"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.requireRole = requireRole;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Unauthorized — no token provided.' });
        return;
    }
    const token = authHeader.split(' ')[1];
    // 1. Support demo / mock session tokens
    if (token === 'demo_jwt_token' || token.startsWith('demo_') || token.startsWith('mock_')) {
        try {
            let targetRole = 'student';
            let email = 'student@unimentor.dev';
            if (token.includes('mentor') || token.includes('tutor')) {
                targetRole = 'mentor';
                email = 'sarah.desilva@campus.ac.lk';
            }
            else if (token.includes('admin')) {
                targetRole = 'admin';
                email = 'admin@unimentor.dev';
            }
            let demoUser = await User_1.default.findOne({
                $or: [{ email }, { role: targetRole }]
            });
            if (!demoUser) {
                demoUser = await User_1.default.create({
                    name: targetRole === 'mentor' ? 'Dr. Sarah De Silva' : targetRole === 'admin' ? 'Admin Kasun' : 'Kavindu Perera',
                    email,
                    password: 'password123',
                    role: targetRole,
                });
            }
            req.userId = String(demoUser._id);
            req.userRole = demoUser.role;
            next();
            return;
        }
        catch {
            // Fall through to JWT verification
        }
    }
    // 2. Standard JWT verification
    try {
        const secret = process.env.JWT_SECRET ?? 'changeme';
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        const user = await User_1.default.findById(decoded.id).select('role tokenVersion');
        if (!user || (decoded.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
            res.status(401).json({ message: 'This sign-in was ended. Sign in again.' });
            return;
        }
        req.userId = String(user._id);
        req.userRole = user.role;
        next();
    }
    catch {
        res.status(401).json({ message: 'Unauthorized — invalid or expired token.' });
    }
}
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.userRole || !roles.includes(req.userRole)) {
            res.status(403).json({ message: 'Forbidden — insufficient permissions.' });
            return;
        }
        next();
    };
}

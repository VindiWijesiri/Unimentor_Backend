"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDemoAccounts = seedDemoAccounts;
const User_1 = __importDefault(require("../models/User"));
const DEMO_PASSWORD = 'password123';
const DEMO_ACCOUNTS = [
    {
        name: 'Nethmi Silva',
        email: 'student@unimentor.dev',
        role: 'student',
        bio: 'Demo undergraduate student account.',
    },
    {
        name: 'Campus Admin',
        email: 'admin@unimentor.dev',
        role: 'admin',
        bio: 'Demo campus administrator for UniMentor.',
    },
    {
        name: 'Faculty LIC',
        email: 'lic@unimentor.dev',
        role: 'lic',
        bio: 'Demo Lecturer-in-Charge for assessment review.',
    },
    {
        name: 'Faculty LIC',
        email: 'lic.admin@unimentor.test',
        role: 'lic',
        bio: 'Campus admin and lecturer-in-charge reviewer.',
    },
];
async function seedDemoAccounts() {
    for (const account of DEMO_ACCOUNTS) {
        const existing = await User_1.default.findOne({ email: account.email });
        if (existing) {
            if (existing.role !== account.role) {
                existing.role = account.role;
                await existing.save();
            }
            continue;
        }
        await User_1.default.create({
            ...account,
            password: DEMO_PASSWORD,
        });
        console.log(`✅ Demo account ready: ${account.email} (${account.role})`);
    }
}

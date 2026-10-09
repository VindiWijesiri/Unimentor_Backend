"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const dns_1 = __importDefault(require("dns"));
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../models/User"));
try {
    dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
}
catch { }
const resolver = new dns_1.default.Resolver();
try {
    resolver.setServers(['8.8.8.8', '1.1.1.1']);
}
catch { }
const customLookup = (hostname, opts, cb) => {
    if (typeof opts === 'function') {
        cb = opts;
        opts = {};
    }
    resolver.resolve4(hostname, (err, addrs) => {
        if (!err && addrs && addrs.length > 0) {
            if (opts && opts.all) {
                return cb(null, addrs.map((a) => ({ address: a, family: 4 })));
            }
            return cb(null, addrs[0], 4);
        }
        dns_1.default.lookup(hostname, opts, cb);
    });
};
async function setupAccounts() {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        console.error('MONGO_URI missing');
        process.exit(1);
    }
    await mongoose_1.default.connect(uri, { lookup: customLookup });
    const targetEmail = process.argv[2] || 'student@unimentor.dev';
    const newPassword = process.argv[3] || 'password123';
    console.log(`Setting password for: ${targetEmail}`);
    let user = await User_1.default.findOne({ email: targetEmail });
    if (!user) {
        console.log(`User ${targetEmail} does not exist in Atlas. Creating student account...`);
        user = new User_1.default({
            name: 'UniMentor Student',
            email: targetEmail,
            password: newPassword,
            role: 'student',
        });
        await user.save();
        console.log(`✅ Created student account "${targetEmail}" with password: "${newPassword}"`);
    }
    else {
        user.password = newPassword;
        await user.save();
        console.log(`✅ Updated password for "${targetEmail}" to: "${newPassword}"`);
    }
    const allStudents = await User_1.default.find({ role: 'student' }).select('name email');
    console.log(`\nAll students in database (${allStudents.length}):`);
    allStudents.forEach((s) => console.log(` - ${s.name} (${s.email})`));
    await mongoose_1.default.disconnect();
    process.exit(0);
}
setupAccounts().catch((e) => {
    console.error('Failed:', e);
    process.exit(1);
});

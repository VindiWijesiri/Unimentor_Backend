"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = connectDB;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const dns_1 = __importDefault(require("dns"));
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../models/User"));
// Configure DNS to use public DNS resolvers (bypasses restrictive local intranet DNS on Wi-Fi)
try {
    dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
}
catch {
    // Ignore if not permitted
}
const resolver = new dns_1.default.Resolver();
try {
    resolver.setServers(['8.8.8.8', '1.1.1.1']);
}
catch {
    // Ignore
}
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
async function migrateLegacyReviewIndexes() {
    const db = mongoose_1.default.connection.db;
    if (!db)
        return;
    const collectionExists = await db.listCollections({ name: 'reviews' }).hasNext();
    if (!collectionExists)
        return;
    const reviews = db.collection('reviews');
    const indexes = await reviews.indexes();
    const legacyIndex = indexes.find(({ name }) => name === 'tutorId_1_studentId_1');
    if (legacyIndex) {
        const legacyReviews = reviews.find({
            tutorId: { $exists: true, $ne: null },
            studentId: { $exists: true, $ne: null },
        });
        for await (const review of legacyReviews) {
            await reviews.updateOne({ _id: review._id }, {
                $set: {
                    tutor: String(review.tutorId),
                    student: review.studentId,
                },
                $unset: { tutorId: '', studentId: '' },
            });
        }
        await reviews.dropIndex('tutorId_1_studentId_1');
        console.log('✅ Legacy review index migrated');
    }
    await reviews.createIndex({ tutor: 1, student: 1 }, { unique: true, name: 'tutor_1_student_1' });
}
async function connectDB() {
    const uri = process.env.MONGO_URI?.trim();
    if (!uri) {
        throw new Error('MONGO_URI is not defined in backend/.env');
    }
    const maskedUri = uri.replace(/:[^:]*@/, ':****@');
    console.log(`\n⏳ Connecting to real MongoDB Atlas database...`);
    console.log(`📍 Connection URI: ${maskedUri}`);
    try {
        await mongoose_1.default.connect(uri, {
            lookup: customLookup,
            serverSelectionTimeoutMS: 10000,
        });
        console.log(`\n============================================================`);
        console.log(`✅ CONNECTED TO REAL DATABASE: ${mongoose_1.default.connection.name}`);
        console.log(`🌐 Cluster Host: ${mongoose_1.default.connection.host}`);
        // Query and log real data from the database
        const totalUsers = await User_1.default.countDocuments();
        const mentors = await User_1.default.find({ role: 'mentor' }).select('name email subjects rating');
        console.log(`📊 TOTAL DOCUMENTS IN USERS COLLECTION: ${totalUsers}`);
        console.log(`👨‍🏫 Real Mentors Count: ${mentors.length}`);
        mentors.forEach((m, i) => {
            console.log(`   [${i + 1}] ${m.name} (${m.email}) - Subjects: [${m.subjects?.join(', ') || 'General'}]`);
        });
        console.log(`============================================================\n`);
        await migrateLegacyReviewIndexes();
    }
    catch (err) {
        console.error('\n❌ FAILED TO CONNECT TO MONGODB ATLAS:');
        console.error(`   Error: ${err.message}`);
        throw err;
    }
    mongoose_1.default.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
    });
}

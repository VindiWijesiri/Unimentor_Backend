"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const mongoose_1 = __importDefault(require("mongoose"));
const https_1 = __importDefault(require("https"));
function printServerErrors(error) {
    const servers = error?.reason?.servers;
    if (!(servers instanceof Map))
        return;
    const details = [...servers.entries()]
        .map(([address, description]) => ({
        address,
        error: description?.error?.cause?.message || description?.error?.message,
        code: description?.error?.cause?.code || description?.error?.code,
    }))
        .filter(({ error, code }) => error || code);
    if (details.length === 0)
        return;
    console.error('\nServer-level diagnostics:');
    for (const detail of details) {
        console.error(` - ${detail.address}: ${detail.code ? `${detail.code} - ` : ''}${detail.error}`);
    }
}
function getPublicIP() {
    return new Promise((resolve) => {
        https_1.default
            .get('https://api.ipify.org', (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => resolve(data.trim()));
        })
            .on('error', () => resolve('Unable to detect'));
    });
}
async function testConnection() {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        console.error('❌ MONGO_URI is not set in backend/.env');
        process.exit(1);
    }
    const maskedUri = uri.replace(/:[^:]*@/, ':****@');
    console.log('🔍 Checking MongoDB Atlas connection...');
    console.log(`📍 Target URI: ${maskedUri}`);
    const publicIP = await getPublicIP();
    console.log(`🌐 Your Current Public IP: ${publicIP}`);
    try {
        const start = Date.now();
        await mongoose_1.default.connect(uri, { serverSelectionTimeoutMS: 5000 });
        const duration = Date.now() - start;
        console.log(`\n✅ Successfully connected to MongoDB Atlas in ${duration}ms!`);
        console.log(`📁 Database Name: ${mongoose_1.default.connection.name}`);
        await mongoose_1.default.disconnect();
        process.exit(0);
    }
    catch (err) {
        console.error(`\n❌ Connection Failed: ${err.message}`);
        printServerErrors(err);
        if (err.name === 'MongooseServerSelectionError' ||
            err.message?.includes('ECONNRESET') ||
            err.message?.includes('Could not connect')) {
            console.log('\n⚠️  Atlas has not whitelisted your IP yet.');
            console.log(`👉 In MongoDB Atlas > Network Access > Add IP Address:`);
            console.log(`   - Add "${publicIP}" or "0.0.0.0/0" (Allow from Anywhere)`);
            console.log('   - Wait ~1 minute after clicking Confirm, then rerun this test.');
        }
        process.exit(1);
    }
}
testConnection();

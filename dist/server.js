"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app_1 = __importDefault(require("./app"));
const db_1 = require("./config/db");
const seedAssessmentWork_1 = require("./services/seedAssessmentWork");
const seedDemoAccounts_1 = require("./services/seedDemoAccounts");
const PORT = Number(process.env.PORT) || 5000;
const HOST = '0.0.0.0';
async function bootstrap() {
    await (0, db_1.connectDB)();
    try {
        await (0, seedDemoAccounts_1.seedDemoAccounts)();
        await (0, seedAssessmentWork_1.ensureAssessmentCatalog)();
    }
    catch (error) {
        console.error('Demo account / assessment catalog seed failed:', error);
    }
    const server = app_1.default.listen(PORT, HOST, () => {
        console.log(`🚀 UniMentor API running on http://localhost:${PORT} (bound to ${HOST})`);
    });
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`\n❌ Port ${PORT} is already in use by another process.`);
            console.error(`👉 Run the following command in PowerShell to free port ${PORT}:`);
            console.error(`   Get-NetTCPConnection -LocalPort ${PORT} | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }\n`);
        }
        else {
            console.error('Server error:', err);
        }
        process.exit(1);
    });
    const shutdown = () => {
        console.log('\n🛑 Shutting down UniMentor server...');
        if (typeof server.closeAllConnections === 'function') {
            server.closeAllConnections();
        }
        server.close(() => {
            console.log('✅ Port released. Server closed.');
            process.exit(0);
        });
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}
bootstrap().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});

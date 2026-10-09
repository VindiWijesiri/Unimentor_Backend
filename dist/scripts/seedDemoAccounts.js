"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../config/db");
const seedDemoAccounts_1 = require("../services/seedDemoAccounts");
async function run() {
    await (0, db_1.connectDB)();
    await (0, seedDemoAccounts_1.seedDemoAccounts)();
    process.exit(0);
}
run().catch((error) => {
    console.error(error);
    process.exit(1);
});

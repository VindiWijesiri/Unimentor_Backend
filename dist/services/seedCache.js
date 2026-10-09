"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoizeSeed = memoizeSeed;
function memoizeSeed(fn) {
    const done = new Set();
    const inflight = new Map();
    return async (userId) => {
        if (done.has(userId))
            return;
        const pending = inflight.get(userId);
        if (pending)
            return pending;
        const task = fn(userId)
            .then(() => {
            done.add(userId);
            inflight.delete(userId);
        })
            .catch((error) => {
            inflight.delete(userId);
            throw error;
        });
        inflight.set(userId, task);
        return task;
    };
}

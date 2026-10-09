"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
function errorHandler(err, _req, res, _next) {
    const statusCode = err.statusCode ?? 500;
    const message = err.message ?? 'Internal Server Error';
    if (process.env.NODE_ENV !== 'production') {
        console.error(`[Error] ${statusCode} — ${message}`, err.stack);
    }
    res.status(statusCode).json({ message });
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const notificationController_1 = require("../controllers/notificationController");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticate, notificationController_1.listNotifications);
router.patch('/:id/read', auth_1.authenticate, notificationController_1.markNotificationRead);
exports.default = router;

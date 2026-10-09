"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mentorController_1 = require("../controllers/mentorController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/search', auth_1.authenticate, mentorController_1.searchMentors);
router.get('/:id', auth_1.authenticate, mentorController_1.getMentorById);
exports.default = router;

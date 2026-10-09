"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const slotController_1 = require("../controllers/slotController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Slots can be viewed publicly or authenticated
router.get('/', slotController_1.getSlots);
router.get('/:id', slotController_1.getSlotById);
// Tutor Slot management
router.post('/', auth_1.authenticate, slotController_1.createSlot);
router.put('/:id', auth_1.authenticate, slotController_1.updateSlot);
router.delete('/:id', auth_1.authenticate, slotController_1.deleteSlot);
// Student registration for slot
router.post('/:id/register', auth_1.authenticate, slotController_1.registerForSlot);
router.post('/:id/cancel-registration', auth_1.authenticate, slotController_1.cancelRegistration);
exports.default = router;

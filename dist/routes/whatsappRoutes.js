"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const whatsappController_1 = require("../controllers/whatsappController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Send booking confirmation via WhatsApp
router.post('/send-booking-confirmation', auth_1.authenticate, whatsappController_1.sendBookingConfirmation);
// Check WhatsApp service status
router.get('/status', auth_1.authenticate, whatsappController_1.checkWhatsAppStatus);
// Send test message
router.post('/test', auth_1.authenticate, whatsappController_1.sendTestMessage);
exports.default = router;

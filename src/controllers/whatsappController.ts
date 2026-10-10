import { Response, NextFunction } from 'express';
import axios from 'axios';
import { AuthRequest } from '../middleware/auth';

// WA Client API configuration (from .env)
const WA_CLIENT_API_URL = process.env.WA_CLIENT_API_URL || 'https://api.waclient.com/api';
const WA_CLIENT_ACCESS_TOKEN = process.env.WA_CLIENT_ACCESS_TOKEN || '';
const WA_CLIENT_INSTANCE_ID = process.env.WA_CLIENT_INSTANCE_ID || '';

/**
 * Send WhatsApp booking confirmation using WA Client Web API
 * POST /api/whatsapp/send-booking-confirmation
 */
export async function sendBookingConfirmation(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      phoneNumber,
      studentName,
      tutorName,
      subject,
      date,
      time,
      amount,
      transactionId,
    } = req.body;

    // Validate required fields
    if (!phoneNumber || !studentName || !tutorName || !transactionId) {
      res.status(400).json({ 
        success: false,
        message: 'Missing required fields: phoneNumber, studentName, tutorName, transactionId' 
      });
      return;
    }

    // Check if WA Client is configured
    if (!WA_CLIENT_ACCESS_TOKEN || !WA_CLIENT_INSTANCE_ID) {
      console.log('⚠️ WA Client not configured, skipping WhatsApp notification');
      res.status(200).json({ 
        success: false,
        message: 'WhatsApp service not configured',
        sent: false,
      });
      return;
    }

    // Format phone number (ensure it has country code)
    let formattedPhone = phoneNumber.replace(/\D/g, ''); // Remove non-digits
    if (!formattedPhone.startsWith('94')) {
      formattedPhone = '94' + formattedPhone; // Add Sri Lanka code
    }

    // Construct WhatsApp message
    const message = `🎓 *UniMentor Booking Confirmed*

Hi ${studentName}!

Your session with *${tutorName}* has been successfully booked.

📚 *Subject:* ${subject || 'Academic Tutoring'}
📅 *Date:* ${date}
⏰ *Time:* ${time}
💰 *Amount Paid:* Rs. ${amount?.toLocaleString() || '0'}
🔖 *Transaction ID:* ${transactionId}

See you at the session! 🚀

- UniMentor Team`;

    // Send message via WA Client Web API
    const response = await axios.post(
      `${WA_CLIENT_API_URL}/send`,
      {
        number: formattedPhone, // WA Client uses "number" not "phone"
        type: 'text',
        message: message,
        instance_id: WA_CLIENT_INSTANCE_ID,
        access_token: WA_CLIENT_ACCESS_TOKEN, // Token goes in body, not header
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      }
    );

    console.log('✅ WhatsApp message sent via WA Client:', response.data);

    res.json({
      success: true,
      message: 'WhatsApp notification sent successfully',
      sent: true,
      messageId: response.data.id || response.data.message_id,
      data: response.data,
    });
  } catch (error: any) {
    console.error('❌ WhatsApp send error:', error.response?.data || error.message);
    
    // Don't fail the booking if WhatsApp fails, just log it
    res.status(200).json({
      success: false,
      message: 'WhatsApp notification failed but booking is confirmed',
      sent: false,
      error: error.response?.data?.message || error.message,
    });
  }
}

/**
 * Check WhatsApp service status
 * GET /api/whatsapp/status
 */
export async function checkWhatsAppStatus(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!WA_CLIENT_ACCESS_TOKEN || !WA_CLIENT_INSTANCE_ID) {
      res.json({
        configured: false,
        message: 'WA Client credentials not configured',
        instructions: 'Add WA_CLIENT_ACCESS_TOKEN and WA_CLIENT_INSTANCE_ID to .env',
      });
      return;
    }

    // Check instance status
    const response = await axios.get(
      `${WA_CLIENT_API_URL}/instance/status`,
      {
        headers: {
          'Authorization': `Bearer ${WA_CLIENT_ACCESS_TOKEN}`,
        },
        params: {
          instance_id: WA_CLIENT_INSTANCE_ID,
        },
        timeout: 5000,
      }
    );

    res.json({
      configured: true,
      status: 'active',
      instance: response.data,
    });
  } catch (error: any) {
    res.status(500).json({
      configured: true,
      status: 'error',
      message: error.response?.data?.message || error.message,
    });
  }
}

/**
 * Send test WhatsApp message
 * POST /api/whatsapp/test
 */
export async function sendTestMessage(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      res.status(400).json({ message: 'phoneNumber is required' });
      return;
    }

    if (!WA_CLIENT_ACCESS_TOKEN || !WA_CLIENT_INSTANCE_ID) {
      res.status(400).json({ 
        message: 'WA Client not configured. Add credentials to .env',
      });
      return;
    }

    let formattedPhone = phoneNumber.replace(/\D/g, '');
    if (!formattedPhone.startsWith('94')) {
      formattedPhone = '94' + formattedPhone;
    }

    const testMessage = `✅ *UniMentor Test Message*

This is a test message from UniMentor backend.

If you received this, WhatsApp integration is working correctly! 🎉`;

    const response = await axios.post(
      `${WA_CLIENT_API_URL}/send`,
      {
        phone: formattedPhone,
        message: testMessage,
        instance_id: WA_CLIENT_INSTANCE_ID,
      },
      {
        headers: {
          'Authorization': `Bearer ${WA_CLIENT_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    res.json({
      success: true,
      message: 'Test message sent successfully',
      data: response.data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || error.message,
      error: error.response?.data,
    });
  }
}

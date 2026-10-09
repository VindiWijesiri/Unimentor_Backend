import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';

function signToken(user: { _id: unknown; role: string; tokenVersion?: number }): string {
  const secret = process.env.JWT_SECRET ?? 'changeme';
  return jwt.sign(
    { id: String(user._id), role: user.role, tokenVersion: user.tokenVersion ?? 0 },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' } as jwt.SignOptions,
  );
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').toLowerCase().trim();
    const password = String(req.body.password || '');
    const role = req.body.role;
    if (!name || !email || !password) {
      res.status(400).json({ message: 'Name, email, and password are required.' });
      return;
    }
    if (role !== 'student' && role !== 'mentor') {
      res.status(400).json({ message: 'Choose a student or tutor account.' });
      return;
    }

    const existing = await User.findOne({ email });
    if (existing) {
      res.status(409).json({ message: 'Email is already registered.' });
      return;
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      bio: req.body.bio,
      subjects: Array.isArray(req.body.subjects) ? req.body.subjects : undefined,
      degreeProgramme: req.body.degreeProgramme,
      hourlyRate: req.body.hourlyRate,
      university: req.body.university,
      faculty: req.body.faculty,
      department: req.body.department,
      studentId: req.body.studentId,
      phone: req.body.phone,
      accountStatus: 'pending',
      verificationStatus: 'unverified',
      isVerified: false,
    });
    const token = signToken(user);

    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const password = String(req.body.password || '');

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }

    if (user.twoFactorEnabled) {
      const issued = await issueLoginCode(user);
      res.json({
        requiresTwoFactor: true,
        email: user.email,
        emailSent: issued.emailSent,
        ...(issued.emailSent || process.env.NODE_ENV === 'production' ? {} : { devCode: issued.code }),
      });
      return;
    }

    const token = signToken(user);
    res.json({ user, token });
  } catch (err) {
    next(err);
  }
}

async function issueLoginCode(user: { email: string; loginCode?: string; loginCodeExpires?: Date; save: () => Promise<unknown> }) {
  const code = crypto.randomInt(100000, 999999).toString();
  user.loginCode = code;
  user.loginCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();
  const emailSent = await sendResetCodeEmail(user.email, code);
  return { code, emailSent };
}

export async function campusLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    if (!email) {
      res.status(400).json({ message: 'Campus email is required.' });
      return;
    }
    const user = await User.findOne({ email });
    if (!user) {
      res.json({
        message: 'If that campus email is registered, a sign-in code has been sent.',
        emailSent: false,
      });
      return;
    }
    const issued = await issueLoginCode(user);
    res.json({
      requiresTwoFactor: true,
      email: user.email,
      emailSent: issued.emailSent,
      ...(issued.emailSent || process.env.NODE_ENV === 'production' ? {} : { devCode: issued.code }),
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyLoginCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const code = String(req.body.code || '').trim();
    const user = await User.findOne({ email });
    if (!user || !user.loginCode || !user.loginCodeExpires || user.loginCode !== code || new Date() > user.loginCodeExpires) {
      res.status(400).json({ message: 'That sign-in code is invalid or expired.' });
      return;
    }
    await User.updateOne({ _id: user._id }, { $unset: { loginCode: 1, loginCodeExpires: 1 } });
    res.json({ user, token: signToken(user) });
  } catch (err) {
    next(err);
  }
}

export async function revokeSessions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();
    res.json({ token: signToken(user), message: 'Other sessions were signed out.' });
  } catch (err) {
    next(err);
  }
}

async function sendResetCodeEmail(email: string, code: string): Promise<boolean> {
  const gmailUser = process.env.GMAIL_USER?.trim();
  const gmailAppPass = process.env.GMAIL_APP_PASS?.replace(/\s+/g, '');

  if (!gmailUser || !gmailAppPass) {
    console.warn('[sendResetCodeEmail] GMAIL_USER or GMAIL_APP_PASS not configured in .env');
    return false;
  }

  try {
    let nodemailer: any;
    try {
      nodemailer = require('nodemailer');
    } catch {
      console.warn('[sendResetCodeEmail] nodemailer not installed in node_modules.');
      return false;
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPass,
      },
    });

    await transporter.sendMail({
      from: `"UniMentor" <${gmailUser}>`,
      to: email,
      subject: 'UniMentor Verification Code',
      text: `Your UniMentor verification code is: ${code}. It will expire in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #E5E7EB; borderRadius: 12px;">
          <h2 style="color: #1565C0; margin-bottom: 8px;">UniMentor Verification</h2>
          <p style="color: #4B5563; font-size: 14px;">Use the following 6-digit verification code to complete your verification:</p>
          <div style="background-color: #F0F5FF; border: 2px dashed #1565C0; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1565C0;">${code}</span>
          </div>
          <p style="color: #6B7280; font-size: 13px;">This code will expire in 10 minutes. If you did not request this code, please ignore this email.</p>
        </div>
      `,
    });

    console.log(`[sendResetCodeEmail] ✅ Email successfully sent to ${email} via Gmail (${gmailUser})`);
    return true;
  } catch (err: any) {
    console.warn(`[sendResetCodeEmail] ❌ SMTP delivery failed to ${email}: ${err?.message || err}`);
    return false;
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: 'Email is required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      res.json({
        message: 'If that email is registered, a verification code has been sent.',
        emailSent: false,
      });
      return;
    }

    const code = crypto.randomInt(100000, 999999).toString();
    user.passwordResetCode = code;
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.passwordResetVerified = false;
    await user.save();

    const emailSent = await sendResetCodeEmail(normalizedEmail, code);

    console.log(`[Forgot Password] Verification code generated for ${normalizedEmail}: ${code} (Email sent: ${emailSent})`);

    res.json({
      message: emailSent
        ? 'A verification code has been sent to your email.'
        : 'If that email is registered, a verification code has been sent.',
      emailSent,
      ...(emailSent || process.env.NODE_ENV === 'production' ? {} : { devCode: code }),
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyResetCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      res.status(400).json({ message: 'Email and verification code are required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanCode = String(code).trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    const now = new Date();
    if (!user.passwordResetCode || !user.passwordResetExpires || now > user.passwordResetExpires) {
      res.status(400).json({ message: 'Verification code is expired or invalid.' });
      return;
    }

    if (user.passwordResetCode !== cleanCode) {
      res.status(400).json({ message: 'Invalid verification code.' });
      return;
    }

    user.passwordResetVerified = true;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    res.json({ message: 'Verification successful.' });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email and new password are required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    if (!user.passwordResetVerified) {
      res.status(400).json({ message: 'Please verify the reset code before changing the password.' });
      return;
    }

    user.password = password;
    user.passwordResetCode = undefined;
    user.passwordResetExpires = undefined;
    user.passwordResetVerified = false;
    await user.save();

    res.json({ message: 'Password reset successfully.' });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const currentPassword = String(req.body.currentPassword || '');
    const newPassword = String(req.body.newPassword || '');
    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: 'Current and new passwords are required.' });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ message: 'New password must be at least 6 characters.' });
      return;
    }
    const user = await User.findById(req.userId).select('+password');
    if (!user || !(await user.comparePassword(currentPassword))) {
      res.status(401).json({ message: 'Current password is incorrect.' });
      return;
    }
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated.' });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.userId).select('-idPhoto -referenceFaceImage -loginCode -loginCodeExpires -passwordResetCode -passwordResetExpires');
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

// In-memory OTP storage for registration / email verification
const registrationOtpStore = new Map<string, { code: string; expires: Date }>();

export async function sendVerificationOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: 'Email is required.' });
      return;
    }

    const code = crypto.randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    registrationOtpStore.set(email.toLowerCase(), { code, expires });

    const emailSent = await sendResetCodeEmail(email, code);

    if (!emailSent) {
      console.log(`[OTP Notice] Real email to ${email} failed to deliver. Server-side generated code for reference: ${code}`);
    }

    res.json({
      message: emailSent
        ? 'Verification code sent to your email address.'
        : 'Email delivery is not configured. Use the code shown in the app.',
      emailSent,
      ...(emailSent || process.env.NODE_ENV === 'production' ? {} : { devCode: code }),
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyEmailOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      res.status(400).json({ message: 'Email and OTP code are required.' });
      return;
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const record = registrationOtpStore.get(normalizedEmail);
    const now = new Date();

    if (record && record.code === String(code).trim() && now <= record.expires) {
      registrationOtpStore.delete(normalizedEmail);
      const user = await User.findOne({ email: normalizedEmail });
      if (user) {
        user.isVerified = true;
        if (user.role === 'mentor') {
          user.verificationStatus = 'pending';
          user.accountStatus = 'pending';
        } else {
          user.verificationStatus = 'approved';
          user.accountStatus = 'active';
        }
        await user.save();
      }
      res.json({ message: 'Email verified successfully.', verified: true, user });
      return;
    }

    if (record && now > record.expires) {
      res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
      return;
    }

    res.status(400).json({ message: 'Invalid verification code.' });
  } catch (err) {
    next(err);
  }
}

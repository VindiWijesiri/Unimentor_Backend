import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Campus from '../models/Campus';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';

function signToken(id: string, role: string): string {
  const secret = process.env.JWT_SECRET ?? 'changeme';
  return jwt.sign({ id, role }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  } as jwt.SignOptions);
}

function parseFaculties(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(/[,|]/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

export async function registerCampus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      name,
      shortCode,
      city,
      country,
      address,
      website,
      faculties,
      adminName,
      adminEmail,
      adminPassword,
      adminPhone,
    } = req.body as Record<string, unknown>;

    if (!name || !shortCode || !city || !adminName || !adminEmail || !adminPassword) {
      res.status(400).json({ message: 'Campus name, code, city, and admin name, email, and password are required.' });
      return;
    }

    const code = String(shortCode).trim().toUpperCase();
    const email = String(adminEmail).trim().toLowerCase();

    const [existingCampus, existingUser] = await Promise.all([
      Campus.findOne({ shortCode: code }),
      User.findOne({ email }),
    ]);

    if (existingCampus) {
      res.status(409).json({ message: 'A campus with this code is already registered.' });
      return;
    }
    if (existingUser) {
      res.status(409).json({ message: 'That admin email is already registered.' });
      return;
    }

    const campus = await Campus.create({
      name: String(name).trim(),
      shortCode: code,
      city: String(city).trim(),
      country: String(country ?? 'Sri Lanka').trim(),
      address: address ? String(address).trim() : undefined,
      website: website ? String(website).trim() : undefined,
      faculties: parseFaculties(faculties),
      contactName: String(adminName).trim(),
      contactEmail: email,
      contactPhone: adminPhone ? String(adminPhone).trim() : undefined,
      status: 'approved',
    });

    const user = await User.create({
      name: String(adminName).trim(),
      email,
      password: String(adminPassword),
      role: 'admin',
      campusId: campus._id,
    });

    campus.adminUser = user._id as typeof campus.adminUser;
    await campus.save();

    const token = signToken(String(user._id), user.role);
    res.status(201).json({ campus, user, token });
  } catch (error) {
    next(error);
  }
}

export async function listCampuses(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const campuses = await Campus.find({ status: 'approved' })
      .select('name shortCode city country faculties website')
      .sort({ name: 1 })
      .lean();
    res.json(campuses);
  } catch (error) {
    next(error);
  }
}

export async function getCampus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const campus = await Campus.findById(req.params.id);
    if (!campus) {
      res.status(404).json({ message: 'Campus not found.' });
      return;
    }
    res.json(campus);
  } catch (error) {
    next(error);
  }
}

export async function getMyCampus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.userId).select('campusId role');
    if (!user?.campusId) {
      res.status(404).json({ message: 'No campus is linked to this account.' });
      return;
    }
    const campus = await Campus.findById(user.campusId);
    if (!campus) {
      res.status(404).json({ message: 'Campus not found.' });
      return;
    }
    res.json(campus);
  } catch (error) {
    next(error);
  }
}

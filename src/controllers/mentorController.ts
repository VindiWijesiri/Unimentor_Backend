import { Response, NextFunction } from 'express';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';

export async function searchMentors(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const q = (req.query.q as string) ?? '';
    const priceRange = req.query.priceRange as string | undefined;
    const minRating = req.query.minRating ? Number(req.query.minRating) : undefined;
    const regex = new RegExp(q, 'i');

    const filter: Record<string, any> = {
      role: 'mentor',
    };

    if (q.trim()) {
      filter.$or = [{ name: regex }, { subjects: regex }, { bio: regex }];
    }

    if (priceRange === '500-3000') {
      filter.hourlyRate = { $gte: 500, $lte: 3000 };
    } else if (priceRange === '3000-5000') {
      filter.hourlyRate = { $gt: 3000, $lte: 5000 };
    }

    if (minRating) {
      filter.rating = { $gte: minRating };
    }

    const totalMentors = await User.countDocuments({ role: 'mentor' });
    console.log(`🔍 [mentorController.searchMentors] Query: "${q}" | PriceRange: ${priceRange ?? 'any'} | MinRating: ${minRating ?? 'any'}`);

    const mentors = await User.find(filter).select('-password');

    console.log(`   Matched mentors count: ${mentors.length} / ${totalMentors}`);
    if (mentors.length > 0) {
      console.log(`   Names:`, mentors.map((m) => `${m.name} (LKR ${m.hourlyRate ?? 1500}/hr)`).join(', '));
    } else {
      console.log(`   ⚠️ 0 mentors matched query.`);
    }

    res.json(mentors);
  } catch (err) {
    console.error('❌ [mentorController.searchMentors] Error:', err);
    next(err);
  }
}

export async function getMentorById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const mentor = await User.findOne({ _id: req.params.id, role: 'mentor' }).select('-password');
    if (!mentor) {
      res.status(404).json({ message: 'Mentor not found.' });
      return;
    }
    res.json(mentor);
  } catch (err) {
    next(err);
  }
}

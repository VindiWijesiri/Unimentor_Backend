import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import Payment from '../models/Payment';

export async function listMyPayments(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const field = req.userRole === 'mentor' ? 'mentorId' : 'studentId';
    const items = await Payment.find({ [field]: req.userId })
      .populate('studentId', 'name')
      .populate('mentorId', 'name')
      .sort({ createdAt: -1 });
    const totalLkr = items.reduce((sum, item) => sum + item.amountLkr, 0);
    res.json({ totalLkr, items });
  } catch (err) {
    next(err);
  }
}

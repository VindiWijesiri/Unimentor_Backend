import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import Notification from '../models/Notification';

export async function listNotifications(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const items = await Notification.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(40);
    res.json(items);
  } catch (err) {
    next(err);
  }
}

export async function markNotificationRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { read: true },
      { new: true },
    );
    if (!item) {
      res.status(404).json({ message: 'Alert not found.' });
      return;
    }
    res.json(item);
  } catch (err) {
    next(err);
  }
}

import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Review from '../models/Review';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';

async function refreshTutorRating(tutorId: string) {
  if (!mongoose.isValidObjectId(tutorId)) return;
  const [summary] = await Review.aggregate([
    { $match: { tutor: tutorId } },
    { $group: { _id: '$tutor', rating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } },
  ]);

  await User.findByIdAndUpdate(tutorId, {
    rating: summary ? Number(summary.rating.toFixed(1)) : 0,
    reviewCount: summary?.reviewCount ?? 0,
  });
}

export async function getTutorReviews(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const reviews = await Review.find({ tutor: req.params.tutorId }).sort({ updatedAt: -1 });
    res.json(reviews);
  } catch (error) {
    next(error);
  }
}

export async function saveTutorReview(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const tutorId = req.params.tutorId;
    const rating = Number(req.body.rating);
    const comment = String(req.body.comment ?? '').trim();

    const isDatabaseTutor = mongoose.isValidObjectId(tutorId);
    if (!isDatabaseTutor) {
      res.status(400).json({ message: 'Invalid tutor profile.' });
      return;
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      res.status(400).json({ message: 'Choose a rating from 1 to 5.' });
      return;
    }
    if (!comment || comment.length > 500) {
      res.status(400).json({ message: 'Review must contain 1 to 500 characters.' });
      return;
    }

    const [student, tutor] = await Promise.all([
      User.findById(req.userId),
      User.findOne({ _id: tutorId, role: 'mentor' }),
    ]);
    if (!student || !tutor) {
      res.status(404).json({ message: 'Student or tutor was not found.' });
      return;
    }

    const review = await Review.findOneAndUpdate(
      { tutor: tutorId, student: req.userId },
      { $set: { rating, comment, studentName: student.name } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );

    // A saved review should not be reported as failed if summary refresh has a
    // temporary issue. The next review will refresh the aggregate again.
    try {
      await refreshTutorRating(tutorId);
    } catch (ratingError) {
      console.error('Review saved, but tutor rating refresh failed:', ratingError);
    }

    res.status(201).json(review);
  } catch (error) {
    next(error);
  }
}

export async function getMyReviews(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const reviews = await Review.find({ student: req.userId })
      .populate('tutor', 'name subjects profilePicture')
      .sort({ updatedAt: -1 });
    res.json(reviews);
  } catch (error) {
    next(error);
  }
}

export async function updateReview(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { rating, comment } = req.body;
    const review = await Review.findById(req.params.id);
    if (!review) {
      res.status(404).json({ message: 'Review not found.' });
      return;
    }
    if (String(review.student) !== req.userId) {
      res.status(403).json({ message: 'Not authorised to edit this review.' });
      return;
    }

    if (rating !== undefined) {
      const numRating = Number(rating);
      if (!Number.isFinite(numRating) || numRating < 1 || numRating > 5) {
        res.status(400).json({ message: 'Rating must be between 1 and 5.' });
        return;
      }
      review.rating = numRating;
    }
    if (comment !== undefined) {
      review.comment = String(comment).trim();
    }

    await review.save();
    try {
      await refreshTutorRating(String(review.tutor));
    } catch (ratingError) {
      console.error('Tutor rating refresh error:', ratingError);
    }

    res.json(review);
  } catch (error) {
    next(error);
  }
}

export async function deleteReview(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      res.status(404).json({ message: 'Review not found.' });
      return;
    }
    if (String(review.student) !== req.userId) {
      res.status(403).json({ message: 'Not authorised to delete this review.' });
      return;
    }

    const tutorId = String(review.tutor);
    await Review.findByIdAndDelete(req.params.id);
    try {
      await refreshTutorRating(tutorId);
    } catch (ratingError) {
      console.error('Tutor rating refresh error:', ratingError);
    }

    res.json({ message: 'Review deleted successfully.', id: req.params.id });
  } catch (error) {
    next(error);
  }
}

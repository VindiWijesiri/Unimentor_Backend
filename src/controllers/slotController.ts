import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Slot, { ISlot } from '../models/Slot';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';

export async function getSlots(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { mentorId, date, type } = req.query;
    const filter: any = {};

    if (mentorId && mentorId !== 'all' && mentorId !== 'demo-tutor-1' && mentorId !== 'mentor-alex') {
      filter.$or = [
        { mentorId: mentorId },
        { mentorName: new RegExp(String(mentorId), 'i') },
      ];
    }
    if (date) {
      filter.date = new RegExp(String(date), 'i');
    }
    if (type && type !== 'both') {
      filter.$or = [{ type }, { type: 'both' }];
    }

    let slots = await Slot.find(filter).sort({ createdAt: -1 });

    // Seed default allocated slots if collection is empty
    if (slots.length === 0) {
      const dbMentor = await User.findOne({ role: 'mentor' });
      const mId = dbMentor ? dbMentor._id : 'demo-tutor-1';
      const mName = dbMentor ? dbMentor.name : 'Tharushi Perera';

      const seedSlots = [
        {
          mentorId: mId,
          mentorName: mName,
          title: 'Database Normalization & Query Tuning Deep-Dive',
          module: 'Database Management Systems',
          date: 'Friday, 19 Sep 2025',
          startTime: '09:00 AM',
          endTime: '10:30 AM',
          duration: '90 Mins',
          timeRange: '09:00 AM - 10:30 AM',
          fee: 2500,
          type: 'both',
          maxCapacity: 5,
          bookedCount: 2,
          description:
            'Comprehensive hands-on breakdown of 1NF, 2NF, 3NF, BCNF, with real SLIIT past paper problem solving and indexing strategy.',
          prerequisites: 'Basic SQL and Relational Algebra concepts.',
          mode: 'Online',
          location: 'Microsoft Teams • Room Link Provided Upon Booking',
          targetBatch: 'Year 2 & Year 3',
          registeredAttendees: [
            {
              studentName: 'Kasun Dissanayake',
              studentEmail: 'kasun.d@sliit.lk',
              registeredAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
              status: 'confirmed',
              bookingType: 'individual',
              notes: 'Need special help with 3NF vs BCNF decomp.',
              feePaid: 2500,
            },
            {
              studentName: 'Sanduni Weerasinghe',
              studentEmail: 'sanduni.w@sliit.lk',
              registeredAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
              status: 'confirmed',
              bookingType: 'individual',
              notes: 'Focus on indexing query execution plans.',
              feePaid: 2500,
            },
          ],
          isAvailable: true,
        },
        {
          mentorId: mId,
          mentorName: mName,
          title: 'Tree & Graph Traversals Algorithm Revision Pod',
          module: 'Data Structures & Algorithms',
          date: 'Friday, 19 Sep 2025',
          startTime: '11:00 AM',
          endTime: '12:30 PM',
          duration: '90 Mins',
          timeRange: '11:00 AM - 12:30 PM',
          fee: 1800,
          type: 'group',
          maxCapacity: 6,
          bookedCount: 3,
          description:
            'Interactive group session solving recursive graph traversals, BFS/DFS cycles, and shortest path Dijkstra with peer whiteboard coding.',
          prerequisites: 'Knowledge of arrays, recursion, and linked structures.',
          mode: 'In-Person',
          location: 'SLIIT Malabe Campus • Computing Building Lab 402',
          targetBatch: 'Year 2 Sem 1/2',
          registeredAttendees: [
            {
              studentName: 'SE Revision Pod #3',
              studentEmail: 'pod-lead@sliit.lk',
              registeredAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
              status: 'confirmed',
              bookingType: 'group',
              groupName: 'SE Revision Pod #3',
              groupSize: 3,
              notes: 'Group of 3 SE students preparing for mid-term tests.',
              feePaid: 5400,
            },
          ],
          isAvailable: true,
        },
        {
          mentorId: mId,
          mentorName: mName,
          title: '1-on-1 Software Architecture Design Patterns Mentoring',
          module: 'Software Architecture & Design',
          date: 'Saturday, 20 Sep 2025',
          startTime: '02:00 PM',
          endTime: '03:00 PM',
          duration: '60 Mins',
          timeRange: '02:00 PM - 03:00 PM',
          fee: 3000,
          type: '1-on-1',
          maxCapacity: 1,
          bookedCount: 0,
          description:
            'Private 1-on-1 architecture review for Factory, Singleton, Strategy, and Clean Layered Design principles for your ongoing project.',
          prerequisites: 'OOP fundamentals in Java/TypeScript.',
          mode: 'Online',
          location: 'Zoom Audio/Video Interactive',
          targetBatch: 'Year 3',
          registeredAttendees: [],
          isAvailable: true,
        },
      ];

      await Slot.insertMany(seedSlots);
      slots = await Slot.find(filter).sort({ createdAt: -1 });
    }

    res.json(slots);
  } catch (err) {
    next(err);
  }
}

export async function createSlot(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      title,
      module,
      date,
      startTime,
      endTime,
      duration,
      fee,
      type,
      maxCapacity,
      description,
      prerequisites,
      mode,
      location,
      targetBatch,
    } = req.body;

    if (!title || !date || !startTime || !endTime) {
      res.status(400).json({ message: 'Title, date, start time, and end time are required.' });
      return;
    }

    // Resolve mentor details
    let mentorName = 'Tutor';
    if (req.userId) {
      const u = await User.findById(req.userId);
      if (u) mentorName = u.name;
    }

    const timeRange = `${startTime} - ${endTime}`;
    const calculatedDuration = duration || '60 Mins';
    const parsedFee = Number(fee) || 2000;
    const parsedCapacity = Number(maxCapacity) || (type === '1-on-1' ? 1 : 5);

    const slot = await Slot.create({
      mentorId: req.userId || 'demo-tutor-1',
      mentorName,
      title: title.trim(),
      module: module || 'General Computing',
      date,
      startTime,
      endTime,
      duration: calculatedDuration,
      timeRange,
      fee: parsedFee,
      type: type || 'both',
      maxCapacity: parsedCapacity,
      bookedCount: 0,
      description: description || '',
      prerequisites: prerequisites || 'None',
      mode: mode || 'Online',
      location: location || 'Microsoft Teams',
      targetBatch: targetBatch || 'All Batches',
      registeredAttendees: [],
      isAvailable: true,
    });

    res.status(201).json(slot);
  } catch (err) {
    next(err);
  }
}

export async function getSlotById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const slot = await Slot.findById(req.params.id);
    if (!slot) {
      res.status(404).json({ message: 'Slot not found' });
      return;
    }
    res.json(slot);
  } catch (err) {
    next(err);
  }
}

export async function updateSlot(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const slot = await Slot.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!slot) {
      res.status(404).json({ message: 'Slot not found' });
      return;
    }
    res.json(slot);
  } catch (err) {
    next(err);
  }
}

export async function deleteSlot(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const slot = await Slot.findByIdAndDelete(req.params.id);
    if (!slot) {
      res.status(404).json({ message: 'Slot not found' });
      return;
    }
    res.json({ message: 'Slot deleted successfully', id: req.params.id });
  } catch (err) {
    next(err);
  }
}

export async function registerForSlot(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    let slot: any = null;
    if (mongoose.isValidObjectId(req.params.id)) {
      slot = await Slot.findById(req.params.id);
    }

    const {
      studentName,
      studentEmail,
      studentAvatar,
      faceVerificationPhoto,
      isFaceVerified,
      bookingType,
      groupName,
      groupSize,
      notes,
      feePaid,
      mentorId,
      mentorName,
      title,
      module: slotModule,
      date,
      startTime,
      endTime,
      timeRange,
      duration,
    } = req.body;

    // If slot not found by ObjectId (e.g. string id or generated client slot)
    if (!slot) {
      if (title || slotModule) {
        slot = await Slot.findOne({
          $or: [
            { title: title },
            { date: date, startTime: startTime },
          ],
        });
      }
    }

    // If still not found, create a new persistent Slot in the database so the booking is never lost!
    if (!slot) {
      let resolvedMentorId = mentorId;
      let resolvedMentorName = mentorName;
      if (!resolvedMentorId && req.userId) {
        resolvedMentorId = req.userId;
      }
      if (!resolvedMentorId) {
        const defaultMentor = await User.findOne({ role: 'mentor' });
        resolvedMentorId = defaultMentor ? defaultMentor._id : 'demo-tutor-1';
        resolvedMentorName = defaultMentor ? defaultMentor.name : 'Tharushi Perera';
      }

      slot = await Slot.create({
        mentorId: resolvedMentorId,
        mentorName: resolvedMentorName || 'Tharushi Perera',
        title: title || `${slotModule || 'General'} Mentoring Slot`,
        module: slotModule || 'Database Management Systems',
        date: date || 'Friday, 19 Sep 2025',
        startTime: startTime || '10:00 AM',
        endTime: endTime || '11:30 AM',
        duration: duration || '90 Mins',
        timeRange: timeRange || `${startTime || '10:00 AM'} - ${endTime || '11:30 AM'}`,
        fee: Number(feePaid) || 2500,
        type: bookingType === 'group' ? 'group' : 'both',
        maxCapacity: bookingType === 'group' ? 5 : 1,
        bookedCount: 0,
        description: 'Interactive peer mentoring session.',
        mode: 'Online',
        location: 'Microsoft Teams Meeting',
        registeredAttendees: [],
        isAvailable: true,
      });
    }

    const countToAdd = bookingType === 'group' ? Math.max(1, Number(groupSize) || 1) : 1;

    if (slot.bookedCount + countToAdd > slot.maxCapacity && slot.type !== 'both') {
      res.status(400).json({ message: 'Slot does not have enough remaining capacity.' });
      return;
    }

    const attendee = {
      studentId: req.userId || undefined,
      studentName: studentName || 'Student',
      studentEmail: studentEmail || 'student@sliit.lk',
      studentAvatar: studentAvatar || undefined,
      faceVerificationPhoto: faceVerificationPhoto || studentAvatar || undefined,
      isFaceVerified: isFaceVerified !== false,
      registeredAt: new Date(),
      status: 'confirmed' as const,
      bookingType: (bookingType === 'group' ? 'group' : 'individual') as 'group' | 'individual',
      groupName: groupName || (bookingType === 'group' ? 'Study Pod' : undefined),
      groupSize: countToAdd,
      notes: notes || '',
      feePaid: Number(feePaid) || slot.fee,
    };

    slot.registeredAttendees.push(attendee as any);
    slot.bookedCount += countToAdd;
    if (slot.bookedCount >= slot.maxCapacity) {
      slot.isAvailable = false;
    }

    await slot.save();
    res.json(slot);
  } catch (err) {
    next(err);
  }
}

export async function cancelRegistration(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const slot = await Slot.findById(req.params.id);
    if (!slot) {
      res.status(404).json({ message: 'Slot not found' });
      return;
    }

    const { attendeeId, studentEmail, studentName } = req.body;
    let attendeeIndex = -1;

    if (attendeeId) {
      attendeeIndex = slot.registeredAttendees.findIndex((a: any) => String(a._id) === String(attendeeId) || a.id === attendeeId);
    }
    if (attendeeIndex === -1 && studentEmail) {
      attendeeIndex = slot.registeredAttendees.findIndex(
        (a: any) => a.studentEmail && a.studentEmail.toLowerCase() === studentEmail.toLowerCase()
      );
    }
    if (attendeeIndex === -1 && studentName) {
      attendeeIndex = slot.registeredAttendees.findIndex(
        (a: any) => a.studentName && a.studentName.toLowerCase().includes(studentName.toLowerCase())
      );
    }

    if (attendeeIndex >= 0) {
      const attendee = slot.registeredAttendees[attendeeIndex];
      const countToRemove = attendee.bookingType === 'group' ? (attendee.groupSize || 1) : 1;
      slot.registeredAttendees.splice(attendeeIndex, 1);
      slot.bookedCount = Math.max(0, slot.bookedCount - countToRemove);
    } else {
      // General decrement fallback
      slot.bookedCount = Math.max(0, slot.bookedCount - 1);
      if (slot.registeredAttendees.length > 0) {
        slot.registeredAttendees.pop();
      }
    }

    slot.isAvailable = slot.bookedCount < slot.maxCapacity;
    await slot.save();
    console.log(`\n📅 [SLOT CANCELLED] Slot ${slot._id} bookedCount is now ${slot.bookedCount}/${slot.maxCapacity}`);
    res.json(slot);
  } catch (err) {
    next(err);
  }
}

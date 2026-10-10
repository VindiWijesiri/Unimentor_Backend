import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import ChatMessage from '../models/ChatMessage';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';

const conversationKey = (firstId: string, secondId: string) =>
  [firstId, secondId].sort().join(':');

const sampleWaveforms = [
  [25, 45, 70, 95, 60, 40, 80, 55, 30, 65, 85, 40, 20],
  [30, 60, 40, 90, 85, 70, 50, 65, 95, 80, 45, 35, 60],
  [20, 35, 55, 80, 65, 50, 75, 90, 85, 60, 40, 50, 30],
];

export async function getChatInbox(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const currentUserId = String(req.userId);
    let messages = await ChatMessage.find({
      $or: [{ sender: currentUserId }, { receiver: currentUserId }],
    }).sort({ createdAt: -1 });

    // If current user has no messages, auto-seed realistic conversations for both mentors & students
    if (messages.length === 0 && currentUserId) {
      const currentUser = await User.findById(currentUserId);
      if (currentUser) {
        if (currentUser.role === 'mentor') {
          // Find or create student accounts to simulate incoming student inquiries
          let student = await User.findOne({ role: 'student' });
          if (!student) {
            student = await User.create({
              name: 'Nethmi Silva',
              email: 'nethmi.silva@student.unimentor.dev',
              password: 'password123',
              role: 'student',
              degreeProgramme: 'BSc (Hons) in Software Engineering',
              academicYear: 'Year 2',
            });
          }

          const partnerId = String(student._id);
          const key = conversationKey(currentUserId, partnerId);

          const seedMessages = [
            {
              conversationKey: key,
              sender: partnerId,
              receiver: currentUserId,
              text: 'Hello! Are you free for a session on Graph Traversals recursion before our upcoming lab test?',
              messageType: 'text',
              read: true,
              createdAt: new Date(Date.now() - 3600000 * 4),
            },
            {
              conversationKey: key,
              sender: partnerId,
              receiver: currentUserId,
              text: 'Voice note: Explaining the recursion base case issue',
              messageType: 'voice',
              voiceDuration: 18,
              voiceWaveform: sampleWaveforms[0],
              read: true,
              createdAt: new Date(Date.now() - 3600000 * 3),
            },
            {
              conversationKey: key,
              sender: currentUserId,
              receiver: partnerId,
              text: 'Hi Nethmi! Yes, I listened to your voice note. The stack overflow occurs because the visited set is not passed into the helper. Let us review it during our peer session tomorrow!',
              messageType: 'text',
              read: true,
              createdAt: new Date(Date.now() - 3600000 * 2),
            },
            {
              conversationKey: key,
              sender: partnerId,
              receiver: currentUserId,
              text: 'Thank you so much! I have registered for the 10:00 AM slot. See you then!',
              messageType: 'text',
              read: false,
              createdAt: new Date(Date.now() - 1800000),
            },
          ];

          await ChatMessage.insertMany(seedMessages);
        } else {
          // Current user is student, seed chats with verified mentors
          const mentors = await User.find({ role: 'mentor' }).limit(3);
          if (mentors.length > 0) {
            const m1 = mentors[0];
            const m2 = mentors[1] || mentors[0];
            const key1 = conversationKey(currentUserId, String(m1._id));
            const key2 = conversationKey(currentUserId, String(m2._id));

            const seedMessages = [
              {
                conversationKey: key1,
                sender: String(m1._id),
                receiver: currentUserId,
                text: `Hi there! I am ${m1.name}, your peer mentor for Computing modules. Feel free to ask any questions or send voice notes whenever you are stuck!`,
                messageType: 'text',
                read: true,
                createdAt: new Date(Date.now() - 3600000 * 6),
              },
              {
                conversationKey: key1,
                sender: String(m1._id),
                receiver: currentUserId,
                text: 'Voice message: Tips for Data Structures & Algorithms exam prep',
                messageType: 'voice',
                voiceDuration: 24,
                voiceWaveform: sampleWaveforms[1],
                read: true,
                createdAt: new Date(Date.now() - 3600000 * 3),
              },
              {
                conversationKey: key1,
                sender: currentUserId,
                receiver: String(m1._id),
                text: 'Thank you! That voice note about tree traversals was super helpful.',
                messageType: 'text',
                read: true,
                createdAt: new Date(Date.now() - 3600000 * 2),
              },
              {
                conversationKey: key2,
                sender: String(m2._id),
                receiver: currentUserId,
                text: `Hello! Session confirmed for tomorrow. Please remember to push your latest code to GitHub so we can review it live.`,
                messageType: 'text',
                read: false,
                createdAt: new Date(Date.now() - 1200000),
              },
            ];

            await ChatMessage.insertMany(seedMessages);
          }
        }

        // Re-query messages
        messages = await ChatMessage.find({
          $or: [{ sender: currentUserId }, { receiver: currentUserId }],
        }).sort({ createdAt: -1 });
      }
    }

    const latestByConversation = new Map<string, typeof messages[number]>();
    messages.forEach((message) => {
      if (!latestByConversation.has(message.conversationKey)) {
        latestByConversation.set(message.conversationKey, message);
      }
    });

    const latestMessages = [...latestByConversation.values()];
    const participantIds = latestMessages.map((message) =>
      String(message.sender) === currentUserId ? message.receiver : message.sender);
    const participants = await User.find({ _id: { $in: participantIds } })
      .select('name email role profilePicture subjects bio rating reviewCount degreeProgramme academicYear');
    const participantMap = new Map(participants.map((participant) => [String(participant._id), participant]));

    const conversations = latestMessages.map((message) => {
      const participantId = String(message.sender) === currentUserId
        ? String(message.receiver)
        : String(message.sender);
      return {
        participant: participantMap.get(participantId),
        lastMessage: message,
        unreadCount: messages.filter((item) =>
          item.conversationKey === message.conversationKey
          && String(item.receiver) === currentUserId
          && !item.read).length,
      };
    }).filter(({ participant }) => Boolean(participant));

    res.json(conversations);
  } catch (error) {
    next(error);
  }
}

async function validateParticipant(currentUserId: string, participantId: string) {
  if (currentUserId === participantId) return null;

  const currentUser = await User.findById(currentUserId).select('role name profilePicture');
  if (!currentUser) return null;

  let participant = null;
  if (mongoose.isValidObjectId(participantId)) {
    participant = await User.findById(participantId).select(
      'role name profilePicture subjects bio rating reviewCount degreeProgramme academicYear email'
    );
  }

  // Fallback: search by email, name, or slug
  if (!participant) {
    const normalizedName = participantId.replace(/^mentor-|^student-/, '').replace(/-\d+$/, '').replace(/-/g, ' ');
    participant = await User.findOne({
      $or: [
        { email: participantId },
        { name: new RegExp(`^${normalizedName}$`, 'i') },
        { name: new RegExp(normalizedName, 'i') },
      ],
    }).select('role name profilePicture subjects bio rating reviewCount degreeProgramme academicYear email');
  }

  // Role-based fallbacks for mock IDs (e.g. mentor-default, mentor-alex, student-oslo-1)
  if (!participant) {
    if (participantId.includes('mentor') || participantId.includes('tutor') || participantId.includes('tharushi') || participantId.includes('alex')) {
      participant = await User.findOne({ role: 'mentor', _id: { $ne: currentUserId } }).select(
        'role name profilePicture subjects bio rating reviewCount degreeProgramme academicYear email'
      );
    } else if (participantId.includes('student') || participantId.includes('nethmi')) {
      participant = await User.findOne({ role: 'student', _id: { $ne: currentUserId } }).select(
        'role name profilePicture subjects bio rating reviewCount degreeProgramme academicYear email'
      );
    }
  }

  if (!participant || String(participant._id) === currentUserId) return null;
  return participant;
}

export async function getConversation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const currentUserId = String(req.userId);
    const participant = await validateParticipant(currentUserId, req.params.participantId);
    if (!participant) {
      res.status(404).json({ message: 'This chat participant is not available.' });
      return;
    }

    const partnerId = String(participant._id);
    const key = conversationKey(currentUserId, partnerId);
    const messages = await ChatMessage.find({ conversationKey: key }).sort({ createdAt: 1 }).limit(300);

    await ChatMessage.updateMany(
      { conversationKey: key, receiver: currentUserId, read: false },
      { $set: { read: true } },
    );
    res.json(messages);
  } catch (error) {
    next(error);
  }
}

export async function sendMessage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const currentUserId = String(req.userId);
    const participantId = req.params.participantId;
    const { text, messageType, voiceDuration, voiceWaveform, attachmentUrl, attachmentName } = req.body;

    const messageText = String(text ?? (messageType === 'voice' ? '🎤 Voice message' : '')).trim();

    if (!messageText) {
      res.status(400).json({ message: 'Message content cannot be empty.' });
      return;
    }

    const participant = await validateParticipant(currentUserId, participantId);
    if (!participant) {
      res.status(404).json({ message: 'This chat participant is not available.' });
      return;
    }

    const partnerId = String(participant._id);
    const defaultWaveform = [30, 60, 45, 90, 75, 40, 65, 80, 50, 70, 35, 60, 40];

    const message = await ChatMessage.create({
      conversationKey: conversationKey(currentUserId, partnerId),
      sender: currentUserId,
      receiver: partnerId,
      text: messageText,
      messageType: messageType || 'text',
      voiceDuration: voiceDuration || (messageType === 'voice' ? 12 : undefined),
      voiceWaveform: voiceWaveform || (messageType === 'voice' ? defaultWaveform : undefined),
      attachmentUrl,
      attachmentName,
    });
    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
}

export async function updateMessage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const currentUserId = String(req.userId);
    const { messageId } = req.params;
    const text = String(req.body.text ?? '').trim();

    if (!text || text.length > 3000) {
      res.status(400).json({ message: 'Message text must be between 1 and 3000 characters.' });
      return;
    }

    const message = await ChatMessage.findById(messageId);
    if (!message) {
      res.status(404).json({ message: 'Message not found.' });
      return;
    }

    if (String(message.sender) !== currentUserId) {
      res.status(403).json({ message: 'You can only edit your own messages.' });
      return;
    }

    message.text = text;
    await message.save();
    res.json(message);
  } catch (error) {
    next(error);
  }
}

export async function deleteMessage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const currentUserId = String(req.userId);
    const { messageId } = req.params;

    const message = await ChatMessage.findById(messageId);
    if (!message) {
      res.status(404).json({ message: 'Message not found.' });
      return;
    }

    if (String(message.sender) !== currentUserId) {
      res.status(403).json({ message: 'You can only delete your own messages.' });
      return;
    }

    await ChatMessage.findByIdAndDelete(messageId);
    res.json({ message: 'Message deleted successfully', messageId });
  } catch (error) {
    next(error);
  }
}

export async function deleteConversation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const currentUserId = String(req.userId);
    const { participantId } = req.params;
    const participant = await validateParticipant(currentUserId, participantId);
    const partnerId = participant ? String(participant._id) : participantId;
    const key = conversationKey(currentUserId, partnerId);

    await ChatMessage.deleteMany({ conversationKey: key });
    res.json({ message: 'Conversation cleared successfully' });
  } catch (error) {
    next(error);
  }
}

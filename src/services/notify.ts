import mongoose from 'mongoose';
import Notification, { NoticeKind } from '../models/Notification';

export async function notify(userId: unknown, input: {
  kind: NoticeKind;
  title: string;
  body: string;
  refId?: string;
}) {
  if (!userId || !mongoose.isValidObjectId(String(userId))) return;
  await Notification.create({
    userId,
    kind: input.kind,
    title: input.title,
    body: input.body,
    refId: input.refId,
  });
}

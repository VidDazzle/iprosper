/**
 * In-app notification feed. `pushNotification` records an item for a person;
 * `notify()` calls this automatically whenever it's given a profileId, so every
 * reminder / tap / match / meetup / message also shows up in-app.
 */

import { db } from '@/db';
import { notifications } from '@/db/schema';
import { and, eq, desc, isNull } from 'drizzle-orm';

export type NotificationType = 'reminder' | 'tap' | 'match' | 'meetup' | 'message' | 'system' | 'general';

export async function pushNotification(
  profileId: number,
  type: NotificationType,
  title: string,
  body?: string,
  link?: string,
): Promise<void> {
  try {
    await db.insert(notifications).values({
      profileId, type, title, body: body || null, link: link || null, createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('pushNotification failed:', err);
  }
}

export async function listNotifications(profileId: number, limit = 50) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.profileId, profileId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function unreadCount(profileId: number): Promise<number> {
  const rows = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.profileId, profileId), isNull(notifications.readAt)));
  return rows.length;
}

export async function markRead(profileId: number, id?: number): Promise<void> {
  const now = new Date().toISOString();
  if (id) {
    await db.update(notifications).set({ readAt: now }).where(and(eq(notifications.id, id), eq(notifications.profileId, profileId)));
  } else {
    // Mark all as read.
    await db.update(notifications).set({ readAt: now }).where(and(eq(notifications.profileId, profileId), isNull(notifications.readAt)));
  }
}

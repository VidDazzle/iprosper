/**
 * In-app direct messaging. People can chat only if they're allowed to — a
 * mutual Discover match, or an active Together connection — so nobody has to
 * hand out a phone number just to talk. Every message also drops an in-app
 * notification for the recipient.
 */

import { db } from '@/db';
import { dmMessages, lifeProfiles, taps, connections } from '@/db/schema';
import { and, eq, or, asc, isNull } from 'drizzle-orm';
import { isBlockedEither } from '@/lib/safety';
import { pushNotification } from '@/lib/notifications';

type Profile = typeof lifeProfiles.$inferSelect;

/** Allowed to message if matched (Discover) or actively connected (Together). */
export async function canMessage(aId: number, bId: number): Promise<boolean> {
  if (aId === bId) return false;
  if (await isBlockedEither(aId, bId)) return false;
  const matched = await db
    .select().from(taps)
    .where(and(eq(taps.fromProfileId, aId), eq(taps.toProfileId, bId), eq(taps.matched, true))).limit(1);
  if (matched[0]) return true;
  const connected = await db
    .select().from(connections)
    .where(and(eq(connections.status, 'active'), or(
      and(eq(connections.inviterProfileId, aId), eq(connections.inviteeProfileId, bId)),
      and(eq(connections.inviterProfileId, bId), eq(connections.inviteeProfileId, aId)),
    ))).limit(1);
  return Boolean(connected[0]);
}

export interface ThreadSummary {
  profileId: number;
  name: string;
  photoUrl: string | null;
  lastMessage: string | null;
  lastAt: string | null;
  unread: number;
}

/** One row per person I can/do talk to, with last message + unread count. */
export async function threads(me: Profile): Promise<ThreadSummary[]> {
  const msgs = await db
    .select().from(dmMessages)
    .where(or(eq(dmMessages.fromProfileId, me.id), eq(dmMessages.toProfileId, me.id)));

  // Collect partner ids from message history + current matches/connections.
  const partnerIds = new Set<number>();
  for (const m of msgs) partnerIds.add(m.fromProfileId === me.id ? m.toProfileId : m.fromProfileId);
  const matched = await db.select().from(taps).where(and(eq(taps.fromProfileId, me.id), eq(taps.matched, true)));
  for (const t of matched) partnerIds.add(t.toProfileId);
  const conns = await db.select().from(connections).where(and(eq(connections.status, 'active'), or(eq(connections.inviterProfileId, me.id), eq(connections.inviteeProfileId, me.id))));
  for (const c of conns) partnerIds.add(c.inviterProfileId === me.id ? (c.inviteeProfileId as number) : c.inviterProfileId);
  partnerIds.delete(me.id);

  const out: ThreadSummary[] = [];
  for (const pid of partnerIds) {
    if (!pid) continue;
    if (await isBlockedEither(me.id, pid)) continue;
    const p = (await db.select().from(lifeProfiles).where(eq(lifeProfiles.id, pid)).limit(1))[0];
    if (!p) continue;
    const conv = msgs
      .filter((m) => m.fromProfileId === pid || m.toProfileId === pid)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const last = conv[0];
    const unread = conv.filter((m) => m.toProfileId === me.id && !m.readAt).length;
    out.push({
      profileId: pid,
      name: p.displayName || p.name || p.email,
      photoUrl: p.discoveryPhotoUrl,
      lastMessage: last?.body || null,
      lastAt: last?.createdAt || null,
      unread,
    });
  }
  out.sort((a, b) => (b.lastAt || '').localeCompare(a.lastAt || ''));
  return out;
}

/** Messages between me and one person (marks the ones to me as read). */
export async function conversation(me: Profile, withId: number) {
  const rows = await db
    .select().from(dmMessages)
    .where(or(
      and(eq(dmMessages.fromProfileId, me.id), eq(dmMessages.toProfileId, withId)),
      and(eq(dmMessages.fromProfileId, withId), eq(dmMessages.toProfileId, me.id)),
    ))
    .orderBy(asc(dmMessages.createdAt));
  // Mark inbound as read.
  await db.update(dmMessages).set({ readAt: new Date().toISOString() })
    .where(and(eq(dmMessages.fromProfileId, withId), eq(dmMessages.toProfileId, me.id), isNull(dmMessages.readAt)));
  return rows.map((m) => ({ id: m.id, mine: m.fromProfileId === me.id, body: m.body, at: m.createdAt }));
}

export async function sendMessage(me: Profile, toId: number, body: string): Promise<{ ok: boolean; message?: string }> {
  if (!body.trim()) return { ok: false, message: 'Empty message.' };
  if (!(await canMessage(me.id, toId))) return { ok: false, message: 'You can only message a match or a connected partner.' };
  await db.insert(dmMessages).values({ fromProfileId: me.id, toProfileId: toId, body: body.trim(), createdAt: new Date().toISOString() });
  const name = me.displayName || me.name || 'Someone';
  await pushNotification(toId, 'message', `💬 ${name}`, body.trim().slice(0, 80), '/chat');
  return { ok: true };
}

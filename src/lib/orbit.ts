/**
 * Orbit — the personal life calendar. Separate from the business Evolve
 * calendar (calendar_events); this is where Life, Fitness, Together, and
 * personal reminders live. Optional two-way sync with the Evolve business
 * calendar is available only to owners with an active Evolve subscription.
 */

import { db } from '@/db';
import { personalEvents, calendarEvents, productSubscriptions, lifeProfiles } from '@/db/schema';
import { and, eq, gte, lte, inArray, isNotNull } from 'drizzle-orm';
import { findFreeSlots, type AvailabilityRule, type BusyEvent } from '@/lib/scheduling';
import { notify } from '@/lib/notify';
import { busyForConnections } from '@/lib/calendar-connect';

export type PersonalEvent = typeof personalEvents.$inferSelect;

export async function listEvents(profileId: number, from: Date, to: Date): Promise<PersonalEvent[]> {
  return db
    .select()
    .from(personalEvents)
    .where(and(eq(personalEvents.profileId, profileId), gte(personalEvents.startsAt, from.toISOString()), lte(personalEvents.startsAt, to.toISOString())));
}

/** Busy blocks for availability: Orbit events, plus the Evolve business calendar when synced. */
export async function busyFor(profileId: number, from: Date, to: Date): Promise<BusyEvent[]> {
  const personal = await listEvents(profileId, from, to);
  const blocks: BusyEvent[] = personal.map((e) => ({ startsAt: e.startsAt, endsAt: e.endsAt, status: 'confirmed' }));

  const prof = (await db.select().from(lifeProfiles).where(eq(lifeProfiles.id, profileId)).limit(1))[0];
  if (prof?.syncEvolve && (await hasEvolveSubscription())) {
    const biz = await db
      .select()
      .from(calendarEvents)
      .where(and(eq(calendarEvents.ownerProfileId, profileId), gte(calendarEvents.startsAt, from.toISOString()), lte(calendarEvents.startsAt, to.toISOString())));
    for (const e of biz) blocks.push({ startsAt: e.startsAt, endsAt: e.endsAt, status: e.status });
  }

  // Plus any external calendars the person has connected (Google / Outlook).
  try {
    blocks.push(...(await busyForConnections(profileId, from, to)));
  } catch (err) {
    console.error('external calendar busy import failed:', err);
  }
  return blocks;
}

/** Whether the owner has an active Evolve (business) subscription. Single-owner
 * app: any active product subscription counts. Codex: scope per billing account. */
export async function hasEvolveSubscription(): Promise<boolean> {
  const rows = await db.select().from(productSubscriptions).where(eq(productSubscriptions.status, 'active')).limit(1);
  return rows.length > 0;
}

export async function createEvent(profileId: number, input: Partial<PersonalEvent> & { title: string; startsAt: string; endsAt: string }): Promise<PersonalEvent> {
  const now = new Date().toISOString();
  const inserted = await db.insert(personalEvents).values({
    profileId,
    title: input.title,
    description: input.description ?? null,
    location: input.location ?? null,
    startsAt: new Date(input.startsAt).toISOString(),
    endsAt: new Date(input.endsAt).toISOString(),
    timezone: input.timezone || 'America/New_York',
    allDay: input.allDay ?? false,
    category: input.category || 'personal',
    color: input.color ?? null,
    source: input.source || 'manual',
    reminderMinutes: input.reminderMinutes ?? null,
    reminderSent: false,
    createdAt: now,
    updatedAt: now,
  }).returning();
  const event = inserted[0];
  // Mirror to Evolve if syncing is on.
  await maybeMirror(profileId, event);
  return event;
}

async function maybeMirror(profileId: number, event: PersonalEvent): Promise<void> {
  const prof = (await db.select().from(lifeProfiles).where(eq(lifeProfiles.id, profileId)).limit(1))[0];
  if (!prof?.syncEvolve || !(await hasEvolveSubscription())) return;
  if (event.evolveEventId) return;
  const now = new Date().toISOString();
  const mirror = await db.insert(calendarEvents).values({
    title: event.title, description: event.description, location: event.location,
    startsAt: event.startsAt, endsAt: event.endsAt, timezone: event.timezone,
    status: 'confirmed', source: 'orbit', ownerProfileId: profileId, createdAt: now, updatedAt: now,
  }).returning();
  await db.update(personalEvents).set({ evolveEventId: mirror[0].id }).where(eq(personalEvents.id, event.id));
}

export async function deleteEvent(profileId: number, id: number): Promise<void> {
  const rows = await db.select().from(personalEvents).where(and(eq(personalEvents.id, id), eq(personalEvents.profileId, profileId))).limit(1);
  const ev = rows[0];
  if (!ev) return;
  if (ev.evolveEventId) await db.delete(calendarEvents).where(eq(calendarEvents.id, ev.evolveEventId));
  await db.delete(personalEvents).where(eq(personalEvents.id, id));
}

/**
 * Turn syncing on/off. Enabling requires an Evolve subscription and back-fills
 * mirrors for existing Orbit events; disabling removes the mirrors.
 */
export async function setSync(profileId: number, on: boolean): Promise<{ ok: boolean; message?: string }> {
  if (on && !(await hasEvolveSubscription())) {
    return { ok: false, message: 'Syncing with the Evolve business calendar requires an active Evolve subscription.' };
  }
  await db.update(lifeProfiles).set({ syncEvolve: on, updatedAt: new Date().toISOString() }).where(eq(lifeProfiles.id, profileId));
  if (on) {
    const all = await db.select().from(personalEvents).where(eq(personalEvents.profileId, profileId));
    for (const e of all) if (!e.evolveEventId) await maybeMirror(profileId, e);
  } else {
    const mirrored = await db.select().from(personalEvents).where(and(eq(personalEvents.profileId, profileId), isNotNull(personalEvents.evolveEventId)));
    for (const e of mirrored) {
      if (e.evolveEventId) await db.delete(calendarEvents).where(eq(calendarEvents.id, e.evolveEventId));
      await db.update(personalEvents).set({ evolveEventId: null }).where(eq(personalEvents.id, e.id));
    }
  }
  return { ok: true };
}

/** Personal free-time rules (broad, evenings + weekends), for planning. */
export function personalRules(timezone: string, slotMinutes = 30): AvailabilityRule[] {
  return [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ dayOfWeek, startTime: '07:00', endTime: '22:00', timezone, slotMinutes, enabled: true }));
}

export async function freeSlots(profileId: number, timezone: string, from: Date, to: Date, durationMin = 60) {
  const busy = await busyFor(profileId, from, to);
  return findFreeSlots(personalRules(timezone, durationMin), busy, from, to, durationMin);
}

export interface OrbitReminderResult { due: number; sent: number; }

/** Dispatch reminders for upcoming Orbit events (once each). Runs on the cron. */
export async function runPersonalEventReminders(): Promise<OrbitReminderResult> {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const horizonIso = new Date(now + 24 * 60 * 60_000).toISOString();
  const upcoming = await db
    .select()
    .from(personalEvents)
    .where(and(eq(personalEvents.reminderSent, false), isNotNull(personalEvents.reminderMinutes), gte(personalEvents.startsAt, nowIso), lte(personalEvents.startsAt, horizonIso)));

  let sent = 0;
  for (const e of upcoming) {
    const fireAt = new Date(e.startsAt).getTime() - (e.reminderMinutes || 0) * 60_000;
    if (fireAt > now) continue; // not yet time
    const prof = (await db.select().from(lifeProfiles).where(eq(lifeProfiles.id, e.profileId)).limit(1))[0];
    if (!prof) continue;
    await notify({
      channel: (prof.reminderChannel as any) || 'email',
      title: `📅 ${e.title}`,
      body: `${e.title}${e.location ? ` · ${e.location}` : ''} — ${new Date(e.startsAt).toLocaleString('en-US', { timeZone: prof.timezone, weekday: 'short', hour: 'numeric', minute: '2-digit' })}`,
      to: prof.email, phone: prof.phone, profileId: prof.id, inAppType: 'reminder', link: '/orbit',
    });
    await db.update(personalEvents).set({ reminderSent: true }).where(eq(personalEvents.id, e.id));
    sent++;
  }
  return { due: upcoming.length, sent };
}

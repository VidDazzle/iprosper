/**
 * Personal reminder dispatcher for Evolve Life. Runs on the cron: fires every
 * due reminder over the person's chosen channel (or a per-reminder override),
 * respects quiet hours, and rolls recurring reminders forward.
 */

import { db } from '@/db';
import { lifeReminders, lifeProfiles } from '@/db/schema';
import { and, eq, lte } from 'drizzle-orm';
import { notify, type NotifyChannel } from '@/lib/notify';

export interface LifeReminderResult {
  due: number;
  sent: number;
  byChannel: Record<string, number>;
}

function inQuietHours(profile: typeof lifeProfiles.$inferSelect, now: Date): boolean {
  const { quietHoursStart: s, quietHoursEnd: e, timezone } = profile;
  if (!s || !e) return false;
  const hhmm = now.toLocaleString('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false });
  // quiet window may wrap past midnight (e.g. 22:00–07:00)
  if (s <= e) return hhmm >= s && hhmm < e;
  return hhmm >= s || hhmm < e;
}

function advance(iso: string, recurrence: string): string | null {
  const d = new Date(iso);
  switch (recurrence) {
    case 'daily': d.setDate(d.getDate() + 1); return d.toISOString();
    case 'weekly': d.setDate(d.getDate() + 7); return d.toISOString();
    case 'monthly': d.setMonth(d.getMonth() + 1); return d.toISOString();
    default: return null;
  }
}

export async function runLifeReminders(): Promise<LifeReminderResult> {
  const nowIso = new Date().toISOString();
  const due = await db
    .select()
    .from(lifeReminders)
    .where(and(eq(lifeReminders.status, 'scheduled'), lte(lifeReminders.whenAt, nowIso)));

  const byChannel: Record<string, number> = {};
  let sent = 0;

  for (const r of due) {
    const profs = await db.select().from(lifeProfiles).where(eq(lifeProfiles.id, r.profileId)).limit(1);
    const profile = profs[0];
    if (!profile) continue;

    const now = new Date();
    if (inQuietHours(profile, now)) continue; // try again next run

    const channel = (r.channel === 'inherit' ? profile.reminderChannel : r.channel) as NotifyChannel;
    const res = await notify({
      channel,
      title: `⏰ ${r.title}`,
      body: r.detail || `Reminder from Evolve — ${r.title}`,
      to: profile.email,
      phone: profile.phone,
      pushEndpoint: profile.pushEndpoint,
    });
    byChannel[channel] = (byChannel[channel] || 0) + 1;
    if (res.delivered || res.queued) sent++;

    const next = advance(r.whenAt, r.recurrence);
    if (next) {
      await db.update(lifeReminders).set({ whenAt: next, sentAt: now.toISOString() }).where(eq(lifeReminders.id, r.id));
    } else {
      await db.update(lifeReminders).set({ status: 'sent', sentAt: now.toISOString() }).where(eq(lifeReminders.id, r.id));
    }
  }

  return { due: due.length, sent, byChannel };
}

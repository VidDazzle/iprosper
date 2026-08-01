import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { personalEvents, mailMessages, lifeReminders } from '@/db/schema';
import { and, eq, gte, lte } from 'drizzle-orm';
import { getOrCreateProfile } from '@/lib/life';
import { unreadCount } from '@/lib/notifications';
import { activeConnectionFor } from '@/lib/together';
import { nearby, matches } from '@/lib/discovery';
import { threads } from '@/lib/chat';

/**
 * GET /api/home?email=
 * The command-center summary: today's agenda, unread mail, upcoming reminders,
 * Discover activity (matches + who tapped you), unread chat + notifications.
 */
export async function GET(request: NextRequest) {
  try {
    const me = await getOrCreateProfile(new URL(request.url).searchParams.get('email'));
    const now = new Date();
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999);
    const soon = new Date(now.getTime() + 3 * 86400_000);

    const [events, unreadMailRows, reminderRows, notifUnread, conn, near, myMatches, myThreads] = await Promise.all([
      db.select().from(personalEvents).where(and(eq(personalEvents.profileId, me.id), gte(personalEvents.startsAt, dayStart.toISOString()), lte(personalEvents.startsAt, dayEnd.toISOString()))),
      db.select().from(mailMessages).where(eq(mailMessages.status, 'unread')),
      db.select().from(lifeReminders).where(and(eq(lifeReminders.profileId, me.id), eq(lifeReminders.status, 'scheduled'), gte(lifeReminders.whenAt, now.toISOString()), lte(lifeReminders.whenAt, soon.toISOString()))),
      unreadCount(me.id),
      activeConnectionFor(me.id),
      nearby(me).catch(() => []),
      matches(me).catch(() => []),
      threads(me).catch(() => []),
    ]);

    const todaysEvents = events
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .slice(0, 6)
      .map((e) => ({ id: e.id, title: e.title, startsAt: e.startsAt, location: e.location }));

    const upcomingReminders = reminderRows
      .sort((a, b) => a.whenAt.localeCompare(b.whenAt))
      .slice(0, 5)
      .map((r) => ({ id: r.id, title: r.title, whenAt: r.whenAt }));

    return NextResponse.json({
      me: { id: me.id, name: me.name || me.email, timezone: me.timezone, onboarded: me.onboarded },
      todaysEvents,
      unreadMail: unreadMailRows.length,
      upcomingReminders,
      notifications: notifUnread,
      hasPartner: Boolean(conn),
      discover: {
        matches: myMatches.length,
        tappedYou: near.filter((p) => p.theyTappedMe && !p.matched).length,
        nearby: near.length,
      },
      unreadChats: myThreads.reduce((n, t) => n + t.unread, 0),
    }, { status: 200 });
  } catch (err) {
    console.error('GET /home error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

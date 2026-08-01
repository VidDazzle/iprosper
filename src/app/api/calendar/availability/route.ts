import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { availabilityRules, calendarEvents } from '@/db/schema';
import { and, gte, lte } from 'drizzle-orm';
import { findFreeSlots } from '@/lib/scheduling';

/**
 * GET  /api/calendar/availability?from=ISO&to=ISO&slotMinutes=&limit=
 *   -> open booking slots computed from availability rules minus booked events.
 * POST /api/calendar/availability  -> create an availability rule.
 *
 * When no availability rules exist yet, a sensible default of Mon–Fri
 * 09:00–17:00 America/New_York (30-min slots) is used so the calendar is
 * usable out of the box.
 */

const DEFAULT_RULES = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
  dayOfWeek,
  startTime: '09:00',
  endTime: '17:00',
  timezone: 'America/New_York',
  slotMinutes: 30,
  enabled: true,
}));

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : now;
    const to = searchParams.get('to')
      ? new Date(searchParams.get('to')!)
      : new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // default 2 weeks
    const slotMinutes = searchParams.get('slotMinutes')
      ? parseInt(searchParams.get('slotMinutes')!, 10)
      : undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

    const dbRules = await db.select().from(availabilityRules);
    const rules = dbRules.length ? dbRules : DEFAULT_RULES;

    const events = await db
      .select({ startsAt: calendarEvents.startsAt, endsAt: calendarEvents.endsAt, status: calendarEvents.status })
      .from(calendarEvents)
      .where(and(gte(calendarEvents.startsAt, from.toISOString()), lte(calendarEvents.startsAt, to.toISOString())));

    const slots = findFreeSlots(rules, events, from, to, slotMinutes).slice(0, limit);

    return NextResponse.json(
      { slots, usingDefaultRules: dbRules.length === 0, count: slots.length },
      { status: 200 },
    );
  } catch (error) {
    console.error('GET /calendar/availability error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dayOfWeek, startTime, endTime, timezone, slotMinutes, enabled } = body;

    if (typeof dayOfWeek !== 'number' || dayOfWeek < 0 || dayOfWeek > 6) {
      return NextResponse.json({ error: 'dayOfWeek must be 0-6' }, { status: 400 });
    }
    if (!/^\d{2}:\d{2}$/.test(startTime || '') || !/^\d{2}:\d{2}$/.test(endTime || '')) {
      return NextResponse.json({ error: 'startTime/endTime must be HH:MM' }, { status: 400 });
    }

    const inserted = await db
      .insert(availabilityRules)
      .values({
        dayOfWeek,
        startTime,
        endTime,
        timezone: timezone || 'America/New_York',
        slotMinutes: typeof slotMinutes === 'number' ? slotMinutes : 30,
        enabled: enabled !== false,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json({ rule: inserted[0] }, { status: 201 });
  } catch (error) {
    console.error('POST /calendar/availability error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

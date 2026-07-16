import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { calendarEvents } from '@/db/schema';
import { and, gte, lte, desc, asc, eq } from 'drizzle-orm';
import { hasConflict, generateMeetingUrl } from '@/lib/scheduling';

/**
 * GET  /api/calendar/events?from=ISO&to=ISO&status=&limit=&order=
 * POST /api/calendar/events   { title, startsAt, endsAt, ... }
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const order = searchParams.get('order') === 'desc' ? desc : asc;

    const conditions = [];
    if (from) conditions.push(gte(calendarEvents.startsAt, from));
    if (to) conditions.push(lte(calendarEvents.startsAt, to));
    if (status) conditions.push(eq(calendarEvents.status, status));

    const query = db.select().from(calendarEvents).$dynamic();
    const rows = await (conditions.length ? query.where(and(...conditions)) : query)
      .orderBy(order(calendarEvents.startsAt))
      .limit(limit);

    return NextResponse.json({ events: rows }, { status: 200 });
  } catch (error) {
    console.error('GET /calendar/events error:', error);
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      location,
      startsAt,
      endsAt,
      timezone,
      attendees,
      organizerEmail,
      status,
      source,
      agentNotes,
      reminderMinutes,
      allowConflict,
    } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'title is required', code: 'MISSING_TITLE' }, { status: 400 });
    }
    if (!startsAt || !endsAt) {
      return NextResponse.json({ error: 'startsAt and endsAt are required', code: 'MISSING_TIME' }, { status: 400 });
    }
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: 'startsAt/endsAt must be valid ISO dates', code: 'BAD_TIME' }, { status: 400 });
    }
    if (end <= start) {
      return NextResponse.json({ error: 'endsAt must be after startsAt', code: 'BAD_RANGE' }, { status: 400 });
    }

    // Conflict guard (skippable for double-booking on purpose).
    if (!allowConflict) {
      const existing = await db
        .select({ startsAt: calendarEvents.startsAt, endsAt: calendarEvents.endsAt, status: calendarEvents.status })
        .from(calendarEvents);
      if (hasConflict(existing, start.toISOString(), end.toISOString())) {
        return NextResponse.json(
          { error: 'Requested time conflicts with an existing event', code: 'CONFLICT' },
          { status: 409 },
        );
      }
    }

    const nowIso = new Date().toISOString();
    const attendeeStr = Array.isArray(attendees) ? attendees.join(',') : attendees || null;

    const inserted = await db
      .insert(calendarEvents)
      .values({
        title: title.trim(),
        description: description?.trim() || null,
        location: location?.trim() || null,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        timezone: timezone || 'America/New_York',
        status: status || 'scheduled',
        attendees: attendeeStr,
        organizerEmail: organizerEmail || null,
        meetingUrl: generateMeetingUrl(),
        source: source || 'manual',
        agentNotes: agentNotes || null,
        reminderMinutes: typeof reminderMinutes === 'number' ? reminderMinutes : null,
        reminderSent: false,
        createdAt: nowIso,
        updatedAt: nowIso,
      })
      .returning();

    return NextResponse.json({ event: inserted[0] }, { status: 201 });
  } catch (error) {
    console.error('POST /calendar/events error:', error);
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

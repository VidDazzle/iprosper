import { NextResponse } from 'next/server';
import { db } from '@/db';
import { calendarEvents } from '@/db/schema';
import { and, gte, ne } from 'drizzle-orm';
import { buildIcs } from '@/lib/ics';

/**
 * GET /api/calendar/ics — a subscribable feed of upcoming (non-cancelled)
 * events. Users can subscribe to this URL in Google/Apple Calendar.
 */
export async function GET() {
  const nowIso = new Date().toISOString();
  const rows = await db
    .select()
    .from(calendarEvents)
    .where(and(gte(calendarEvents.startsAt, nowIso), ne(calendarEvents.status, 'cancelled')))
    .limit(500);

  const ics = buildIcs(rows, 'Evolve Calendar');
  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="evolve-calendar.ics"',
    },
  });
}

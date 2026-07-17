import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { calendarEvents } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { buildIcs } from '@/lib/ics';

/** GET /api/calendar/events/[id]/ics — download one event as a .ics file. */
type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const id = parseInt((await params).id, 10);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const rows = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id)).limit(1);
  const ev = rows[0];
  if (!ev) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  const ics = buildIcs([ev], ev.title);
  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="event-${id}.ics"`,
    },
  });
}

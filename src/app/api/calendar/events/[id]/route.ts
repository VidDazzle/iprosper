import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { calendarEvents } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET/PATCH/DELETE a single calendar event by id.
 * DELETE performs a soft cancel (status = cancelled) by default; pass
 * ?hard=true to remove the row entirely.
 */

type Params = { params: Promise<{ id: string }> };

async function findEvent(id: number) {
  const rows = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id)).limit(1);
  return rows[0] || null;
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const id = parseInt((await params).id, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    const event = await findEvent(id);
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    return NextResponse.json({ event }, { status: 200 });
  } catch (error) {
    console.error('GET /calendar/events/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const id = parseInt((await params).id, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    const existing = await findEvent(id);
    if (!existing) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    const body = await request.json();
    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };

    const fields = [
      'title', 'description', 'location', 'timezone', 'status',
      'organizerEmail', 'meetingUrl', 'agentNotes', 'reminderMinutes',
    ] as const;
    for (const f of fields) {
      if (body[f] !== undefined) patch[f] = body[f];
    }
    if (body.attendees !== undefined) {
      patch.attendees = Array.isArray(body.attendees) ? body.attendees.join(',') : body.attendees;
    }
    if (body.startsAt !== undefined) {
      const d = new Date(body.startsAt);
      if (isNaN(d.getTime())) return NextResponse.json({ error: 'Invalid startsAt' }, { status: 400 });
      patch.startsAt = d.toISOString();
    }
    if (body.endsAt !== undefined) {
      const d = new Date(body.endsAt);
      if (isNaN(d.getTime())) return NextResponse.json({ error: 'Invalid endsAt' }, { status: 400 });
      patch.endsAt = d.toISOString();
    }

    const updated = await db
      .update(calendarEvents)
      .set(patch)
      .where(eq(calendarEvents.id, id))
      .returning();

    return NextResponse.json({ event: updated[0] }, { status: 200 });
  } catch (error) {
    console.error('PATCH /calendar/events/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const id = parseInt((await params).id, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    const existing = await findEvent(id);
    if (!existing) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    const hard = new URL(request.url).searchParams.get('hard') === 'true';
    if (hard) {
      await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
      return NextResponse.json({ deleted: true, id }, { status: 200 });
    }
    const updated = await db
      .update(calendarEvents)
      .set({ status: 'cancelled', updatedAt: new Date().toISOString() })
      .where(eq(calendarEvents.id, id))
      .returning();
    return NextResponse.json({ event: updated[0], cancelled: true }, { status: 200 });
  } catch (error) {
    console.error('DELETE /calendar/events/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

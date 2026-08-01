import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { personalEvents, calendarEvents } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { getOrCreateProfile } from '@/lib/life';
import { deleteEvent } from '@/lib/orbit';

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH  /api/orbit/events/[id]  -> update fields (also updates the Evolve mirror).
 * DELETE /api/orbit/events/[id]  -> delete (removes the mirror too).
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const id = Number((await params).id);
    const body = await request.json();
    const me = await getOrCreateProfile(body.email);
    const rows = await db.select().from(personalEvents).where(and(eq(personalEvents.id, id), eq(personalEvents.profileId, me.id))).limit(1);
    const ev = rows[0];
    if (!ev) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const f of ['title', 'description', 'location', 'category', 'color'] as const) if (body[f] !== undefined) patch[f] = body[f] || null;
    if (body.startsAt) patch.startsAt = new Date(body.startsAt).toISOString();
    if (body.endsAt) patch.endsAt = new Date(body.endsAt).toISOString();
    if (body.reminderMinutes !== undefined) { patch.reminderMinutes = body.reminderMinutes == null ? null : Number(body.reminderMinutes); patch.reminderSent = false; }
    if (typeof body.allDay === 'boolean') patch.allDay = body.allDay;

    const updated = await db.update(personalEvents).set(patch).where(eq(personalEvents.id, id)).returning();
    // Keep the Evolve mirror in step.
    if (ev.evolveEventId) {
      await db.update(calendarEvents).set({
        title: updated[0].title, description: updated[0].description, location: updated[0].location,
        startsAt: updated[0].startsAt, endsAt: updated[0].endsAt, updatedAt: new Date().toISOString(),
      }).where(eq(calendarEvents.id, ev.evolveEventId));
    }
    return NextResponse.json({ event: updated[0] }, { status: 200 });
  } catch (err) {
    console.error('PATCH /orbit/events/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const id = Number((await params).id);
    const me = await getOrCreateProfile(new URL(request.url).searchParams.get('email'));
    await deleteEvent(me.id, id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('DELETE /orbit/events/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

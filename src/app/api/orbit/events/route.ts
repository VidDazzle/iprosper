import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateProfile } from '@/lib/life';
import { listEvents, createEvent } from '@/lib/orbit';

/**
 * GET  /api/orbit/events?from=&to=&email= -> personal (Orbit) events in a range.
 * POST /api/orbit/events                   -> create { title, startsAt, endsAt,
 *        location?, category?, allDay?, reminderMinutes?, color? }.
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const me = await getOrCreateProfile(url.searchParams.get('email'));
    const now = new Date();
    const from = url.searchParams.get('from') ? new Date(url.searchParams.get('from')!) : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = url.searchParams.get('to') ? new Date(url.searchParams.get('to')!) : new Date(now.getTime() + 45 * 86400_000);
    const events = await listEvents(me.id, from, to);
    return NextResponse.json({ events: events.sort((a, b) => a.startsAt.localeCompare(b.startsAt)) }, { status: 200 });
  } catch (err) {
    console.error('GET /orbit/events error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.title || !body.startsAt || !body.endsAt) {
      return NextResponse.json({ error: 'title, startsAt, endsAt required' }, { status: 400 });
    }
    const me = await getOrCreateProfile(body.email);
    const event = await createEvent(me.id, {
      title: String(body.title), startsAt: body.startsAt, endsAt: body.endsAt,
      description: body.description, location: body.location, category: body.category,
      allDay: body.allDay, color: body.color, source: body.source || 'manual',
      reminderMinutes: body.reminderMinutes != null ? Number(body.reminderMinutes) : undefined,
      timezone: body.timezone || me.timezone,
    });
    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    console.error('POST /orbit/events error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

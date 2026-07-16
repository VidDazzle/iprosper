import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { availabilityRules, calendarEvents } from '@/db/schema';
import { parseSchedulingRequest, aiConfigured } from '@/lib/ai';
import { findFreeSlots, generateMeetingUrl, FreeSlot } from '@/lib/scheduling';

/**
 * POST /api/calendar/schedule
 * Body: { text: "book a 30 min demo with john@acme.com next Tuesday afternoon",
 *         book?: boolean, timezone?: string }
 *
 * The autonomous scheduler: parses a natural-language request, finds the best
 * open slot that respects availability + existing bookings, and (when book:true)
 * creates the event. Returns the chosen slot plus alternatives.
 */

const DEFAULT_RULES = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
  dayOfWeek,
  startTime: '09:00',
  endTime: '17:00',
  timezone: 'America/New_York',
  slotMinutes: 30,
  enabled: true,
}));

function pickBestSlot(
  slots: FreeSlot[],
  preferredDate: string | null,
  preferredTime: string | null,
): FreeSlot | null {
  if (slots.length === 0) return null;
  let candidates = slots;

  if (preferredDate) {
    const sameDay = slots.filter((s) => s.start.slice(0, 10) === preferredDate);
    if (sameDay.length) candidates = sameDay;
  }
  if (preferredTime) {
    const [ph, pm] = preferredTime.split(':').map((n) => parseInt(n, 10));
    const targetMin = ph * 60 + pm;
    candidates = [...candidates].sort((a, b) => {
      const am = new Date(a.start).getUTCHours() * 60 + new Date(a.start).getUTCMinutes();
      const bm = new Date(b.start).getUTCHours() * 60 + new Date(b.start).getUTCMinutes();
      return Math.abs(am - targetMin) - Math.abs(bm - targetMin);
    });
  }
  return candidates[0];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, book = false, timezone } = body;
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const parsed = await parseSchedulingRequest(text, nowIso);

    // Build the search window: from now (or the preferred date) out ~3 weeks.
    const now = new Date();
    const searchFrom = parsed.preferredDate ? new Date(`${parsed.preferredDate}T00:00:00.000Z`) : now;
    const from = searchFrom.getTime() < now.getTime() ? now : searchFrom;
    const to = new Date(from.getTime() + 21 * 24 * 60 * 60 * 1000);

    const dbRules = await db.select().from(availabilityRules);
    const rules = dbRules.length ? dbRules : DEFAULT_RULES;
    const events = await db
      .select({ startsAt: calendarEvents.startsAt, endsAt: calendarEvents.endsAt, status: calendarEvents.status })
      .from(calendarEvents);

    const slots = findFreeSlots(rules, events, from, to, parsed.durationMinutes);
    const best = pickBestSlot(slots, parsed.preferredDate, parsed.preferredTime);

    if (!best) {
      return NextResponse.json(
        {
          scheduled: false,
          reason: 'No open slots match the request within the next 3 weeks.',
          parsed,
          aiEnabled: aiConfigured(),
        },
        { status: 200 },
      );
    }

    const response: Record<string, unknown> = {
      parsed,
      chosenSlot: best,
      alternatives: slots.filter((s) => s.start !== best.start).slice(0, 5),
      aiEnabled: aiConfigured(),
    };

    if (book) {
      const inserted = await db
        .insert(calendarEvents)
        .values({
          title: parsed.title,
          description: parsed.notes,
          startsAt: best.start,
          endsAt: best.end,
          timezone: timezone || 'America/New_York',
          status: 'scheduled',
          attendees: parsed.attendees.join(',') || null,
          meetingUrl: generateMeetingUrl(),
          source: 'ai',
          agentNotes: `Auto-scheduled from: "${text}"`,
          reminderMinutes: 15,
          reminderSent: false,
          createdAt: nowIso,
          updatedAt: nowIso,
        })
        .returning();
      response.scheduled = true;
      response.event = inserted[0];
    } else {
      response.scheduled = false;
    }

    return NextResponse.json(response, { status: book ? 201 : 200 });
  } catch (error) {
    console.error('POST /calendar/schedule error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

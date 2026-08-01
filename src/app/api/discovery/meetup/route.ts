import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateProfile } from '@/lib/life';
import { requestMeetup, respondMeetup } from '@/lib/discovery';

/**
 * POST  /api/discovery/meetup { email?, toProfileId, whenAt, note? }
 *   Request a specific time to meet a match.
 * PATCH /api/discovery/meetup { email?, id, action: accept | decline }
 *   Respond to a time your match proposed.
 * Both require the two people to be matched.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const me = await getOrCreateProfile(body.email);
    if (!body.toProfileId || !body.whenAt) return NextResponse.json({ error: 'toProfileId and whenAt required' }, { status: 400 });
    const r = await requestMeetup(me, Number(body.toProfileId), body.whenAt, body.note);
    return NextResponse.json(r, { status: r.ok ? 201 : 400 });
  } catch (err) {
    console.error('POST /discovery/meetup error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const me = await getOrCreateProfile(body.email);
    if (!body.id || !['accept', 'decline'].includes(body.action)) return NextResponse.json({ error: 'id and valid action required' }, { status: 400 });
    const r = await respondMeetup(me, Number(body.id), body.action);
    return NextResponse.json(r, { status: r.ok ? 200 : 404 });
  } catch (err) {
    console.error('PATCH /discovery/meetup error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

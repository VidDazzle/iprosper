import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { meetingSignals } from '@/db/schema';
import { and, eq, gt, or, isNull, asc } from 'drizzle-orm';
import { findMeeting } from '@/lib/meetings';

/**
 * WebRTC signaling relay (polling-based) for peer connections in the room mesh.
 *
 * GET  /api/meetings/[id]/signal?peer=<id>&since=<lastId>
 *   -> new signals addressed to this peer (or broadcast) since `since`.
 * POST /api/meetings/[id]/signal
 *   Body: { fromPeer, toPeer?, kind, payload }  (offer|answer|ice|join|leave)
 *
 * This keeps peer video working out of the box for small meetings. For large
 * meetings, point the client at a WebRTC SFU (LiveKit / mediasoup / Daily)
 * instead — the room UI's transport is swappable.
 */
type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const meeting = await findMeeting((await params).id);
    if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const peer = searchParams.get('peer') || '';
    const since = parseInt(searchParams.get('since') || '0', 10);

    const rows = await db
      .select()
      .from(meetingSignals)
      .where(
        and(
          eq(meetingSignals.meetingId, meeting.id),
          gt(meetingSignals.id, isNaN(since) ? 0 : since),
          // Addressed to me or broadcast; never my own messages.
          or(eq(meetingSignals.toPeer, peer), isNull(meetingSignals.toPeer)),
        ),
      )
      .orderBy(asc(meetingSignals.id))
      .limit(100);

    const mine = rows.filter((r) => r.fromPeer !== peer);
    const lastId = rows.length ? rows[rows.length - 1].id : since;
    return NextResponse.json(
      { signals: mine.map((r) => ({ id: r.id, from: r.fromPeer, to: r.toPeer, kind: r.kind, payload: r.payload })), lastId },
      { status: 200 },
    );
  } catch (error) {
    console.error('GET signal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const meeting = await findMeeting((await params).id);
    if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    const body = await request.json();
    if (!body.fromPeer || !body.kind) {
      return NextResponse.json({ error: 'fromPeer and kind are required' }, { status: 400 });
    }
    const inserted = await db
      .insert(meetingSignals)
      .values({
        meetingId: meeting.id,
        fromPeer: String(body.fromPeer),
        toPeer: body.toPeer ? String(body.toPeer) : null,
        kind: String(body.kind),
        payload: body.payload ? JSON.stringify(body.payload) : null,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return NextResponse.json({ id: inserted[0].id }, { status: 201 });
  } catch (error) {
    console.error('POST signal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

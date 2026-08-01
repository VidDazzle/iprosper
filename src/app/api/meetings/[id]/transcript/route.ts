import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { meetingTranscriptLines } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { findMeeting } from '@/lib/meetings';

/**
 * GET  /api/meetings/[id]/transcript  -> ordered transcript lines
 * POST /api/meetings/[id]/transcript  -> append a dictation line
 *   Body: { participantName?, text }
 *
 * The client posts lines from the browser's speech-recognition dictation, and
 * only for participants who consented to transcription (enforced in the room UI
 * before dictation starts).
 */
type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const meeting = await findMeeting((await params).id);
    if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    const lines = await db
      .select()
      .from(meetingTranscriptLines)
      .where(eq(meetingTranscriptLines.meetingId, meeting.id))
      .orderBy(asc(meetingTranscriptLines.at));
    return NextResponse.json({ transcript: lines }, { status: 200 });
  } catch (error) {
    console.error('GET transcript error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const meeting = await findMeeting((await params).id);
    if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    const body = await request.json();
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text) return NextResponse.json({ error: 'text is required' }, { status: 400 });

    const inserted = await db
      .insert(meetingTranscriptLines)
      .values({
        meetingId: meeting.id,
        participantName: body.participantName || null,
        text,
        at: new Date().toISOString(),
      })
      .returning();
    return NextResponse.json({ line: inserted[0] }, { status: 201 });
  } catch (error) {
    console.error('POST transcript error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

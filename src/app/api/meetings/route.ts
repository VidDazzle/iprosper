import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { meetings, meetingParticipants } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { makeRoomCode } from '@/lib/meetings';

/**
 * GET  /api/meetings          -> recent meetings
 * POST /api/meetings          -> create a room (host is added as a participant)
 */

export async function GET() {
  try {
    const rows = await db.select().from(meetings).orderBy(desc(meetings.createdAt)).limit(50);
    return NextResponse.json({ meetings: rows }, { status: 200 });
  } catch (error) {
    console.error('GET /meetings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }
    const nowIso = new Date().toISOString();
    const inserted = await db
      .insert(meetings)
      .values({
        roomCode: makeRoomCode(),
        title: body.title.trim(),
        hostName: body.hostName || null,
        hostEmail: body.hostEmail || null,
        status: 'scheduled',
        calendarEventId: typeof body.calendarEventId === 'number' ? body.calendarEventId : null,
        recordingOffered: body.recordingOffered !== false,
        transcriptionOffered: body.transcriptionOffered !== false,
        summaryOffered: body.summaryOffered !== false,
        createdAt: nowIso,
      })
      .returning();

    const meeting = inserted[0];

    // Seed the host as a participant (they still pass the consent screen).
    if (body.hostName) {
      await db.insert(meetingParticipants).values({
        meetingId: meeting.id,
        name: body.hostName,
        email: body.hostEmail || null,
        role: 'host',
        createdAt: nowIso,
      });
    }

    return NextResponse.json({ meeting }, { status: 201 });
  } catch (error) {
    console.error('POST /meetings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

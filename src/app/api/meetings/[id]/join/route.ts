import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { meetingParticipants } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { findMeeting } from '@/lib/meetings';

/**
 * POST /api/meetings/[id]/join
 * Body: { name, email? }
 *
 * Registers (or re-activates) a participant. Consent is captured separately on
 * the authorization screen via /consent BEFORE any media feature turns on —
 * joining alone grants no recording/transcription rights.
 */
type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const meeting = await findMeeting((await params).id);
    if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });

    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

    const nowIso = new Date().toISOString();
    const email = body.email ? String(body.email).trim().toLowerCase() : null;

    // Re-join an existing named participant, or create a new one.
    const existing = email
      ? await db
          .select()
          .from(meetingParticipants)
          .where(and(eq(meetingParticipants.meetingId, meeting.id), eq(meetingParticipants.email, email)))
          .limit(1)
      : [];

    let participant;
    if (existing[0]) {
      const updated = await db
        .update(meetingParticipants)
        .set({ name, isActive: true, joinedAt: nowIso, leftAt: null })
        .where(eq(meetingParticipants.id, existing[0].id))
        .returning();
      participant = updated[0];
    } else {
      const inserted = await db
        .insert(meetingParticipants)
        .values({
          meetingId: meeting.id,
          name,
          email,
          role: body.role === 'host' ? 'host' : 'participant',
          isActive: true,
          joinedAt: nowIso,
          createdAt: nowIso,
        })
        .returning();
      participant = inserted[0];
    }

    return NextResponse.json(
      {
        participantId: participant.id,
        meetingId: meeting.id,
        roomCode: meeting.roomCode,
        offered: {
          recording: meeting.recordingOffered,
          transcription: meeting.transcriptionOffered,
          summary: meeting.summaryOffered,
        },
        // Reminder to the client: show the consent screen before enabling media.
        consentRequired: true,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /meetings/[id]/join error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

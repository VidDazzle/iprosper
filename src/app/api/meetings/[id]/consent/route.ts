import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { meetingParticipants } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { findMeeting } from '@/lib/meetings';

/**
 * POST /api/meetings/[id]/consent
 * Body: { participantId, recording, transcription, summary, reports }
 *
 * Records a participant's EXPRESS, itemized consent from the authorization
 * screen. Each flag is an explicit opt-in (true) or opt-out (false), stored
 * with a timestamp and the caller IP as the legal record. Nothing is on by
 * default — a participant is opted OUT of everything until they say otherwise.
 */
type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const meeting = await findMeeting((await params).id);
    if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });

    const body = await request.json();
    const participantId = Number(body.participantId);
    if (!Number.isInteger(participantId)) {
      return NextResponse.json({ error: 'participantId is required' }, { status: 400 });
    }

    const xff = request.headers.get('x-forwarded-for');
    const ip = (xff ? xff.split(',')[0].trim() : request.headers.get('x-real-ip')) || 'unknown';

    const updated = await db
      .update(meetingParticipants)
      .set({
        consentRecording: Boolean(body.recording),
        consentTranscription: Boolean(body.transcription),
        consentSummary: Boolean(body.summary),
        consentReports: Boolean(body.reports),
        consentDecidedAt: new Date().toISOString(),
        consentIp: ip,
      })
      .where(eq(meetingParticipants.id, participantId))
      .returning();

    if (!updated[0]) return NextResponse.json({ error: 'Participant not found' }, { status: 404 });

    return NextResponse.json(
      {
        participantId,
        consent: {
          recording: updated[0].consentRecording,
          transcription: updated[0].consentTranscription,
          summary: updated[0].consentSummary,
          reports: updated[0].consentReports,
          decidedAt: updated[0].consentDecidedAt,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('POST /meetings/[id]/consent error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

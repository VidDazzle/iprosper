import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import {
  meetings,
  meetingParticipants,
  meetingAssets,
  assetReviews,
  meetingArtifacts,
  meetingTranscriptLines,
} from '@/db/schema';
import { eq, asc, inArray } from 'drizzle-orm';
import { findMeeting } from '@/lib/meetings';

/**
 * GET   /api/meetings/[id]   -> full meeting state (participants, assets +
 *                               reviews, artifacts, transcript). id = numeric
 *                               id or room code.
 * PATCH /api/meetings/[id]   -> update status (start/end) or offered features.
 */
type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const meeting = await findMeeting((await params).id);
    if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });

    const participants = await db
      .select()
      .from(meetingParticipants)
      .where(eq(meetingParticipants.meetingId, meeting.id));

    const assets = await db
      .select()
      .from(meetingAssets)
      .where(eq(meetingAssets.meetingId, meeting.id))
      .orderBy(asc(meetingAssets.createdAt));

    const assetIds = assets.map((a) => a.id);
    const reviews = assetIds.length
      ? await db.select().from(assetReviews).where(inArray(assetReviews.assetId, assetIds))
      : [];

    const artifacts = await db
      .select()
      .from(meetingArtifacts)
      .where(eq(meetingArtifacts.meetingId, meeting.id));

    const transcript = await db
      .select()
      .from(meetingTranscriptLines)
      .where(eq(meetingTranscriptLines.meetingId, meeting.id))
      .orderBy(asc(meetingTranscriptLines.at));

    return NextResponse.json(
      {
        meeting,
        participants: participants.map((p) => ({
          id: p.id,
          name: p.name,
          email: p.email,
          role: p.role,
          isActive: p.isActive,
          consent: {
            recording: p.consentRecording,
            transcription: p.consentTranscription,
            summary: p.consentSummary,
            reports: p.consentReports,
            decidedAt: p.consentDecidedAt,
          },
        })),
        assets: assets.map((a) => ({
          ...a,
          reviews: reviews.filter((r) => r.assetId === a.id),
        })),
        artifacts,
        transcript,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('GET /meetings/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const meeting = await findMeeting((await params).id);
    if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });

    const body = await request.json();
    const patch: Record<string, unknown> = {};
    if (body.status === 'live') {
      patch.status = 'live';
      if (!meeting.startedAt) patch.startedAt = new Date().toISOString();
    } else if (body.status === 'ended') {
      patch.status = 'ended';
      patch.endedAt = new Date().toISOString();
    }
    for (const f of ['recordingOffered', 'transcriptionOffered', 'summaryOffered', 'isWebinar'] as const) {
      if (typeof body[f] === 'boolean') patch[f] = body[f];
    }
    // Host can pin/clear a "buy now" CTA during a webinar.
    if (body.pinnedCtaUrl !== undefined) patch.pinnedCtaUrl = body.pinnedCtaUrl || null;
    if (body.pinnedCtaLabel !== undefined) patch.pinnedCtaLabel = body.pinnedCtaLabel || null;
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }
    const updated = await db
      .update(meetings)
      .set(patch)
      .where(eq(meetings.id, meeting.id))
      .returning();
    return NextResponse.json({ meeting: updated[0] }, { status: 200 });
  } catch (error) {
    console.error('PATCH /meetings/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { meetingAssets, assetReviews } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

/**
 * GET  /api/meetings/[id]/assets/[assetId]/reviews  -> all reviews on the asset
 * POST /api/meetings/[id]/assets/[assetId]/reviews
 *   Body: { reviewerName, reviewerEmail?, decision, notes?, revision? }
 *
 * Records a client's review against a specific revision: the notes box plus the
 * Approved / Not-Approved decision. Each submission is its own row, so the full
 * revision history and who-approved-what is preserved.
 */
type Params = { params: Promise<{ id: string; assetId: string }> };

const DECISIONS = ['approved', 'not_approved', 'revision_requested', 'pending'];

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const assetId = parseInt((await params).assetId, 10);
    if (isNaN(assetId)) return NextResponse.json({ error: 'Invalid assetId' }, { status: 400 });
    const reviews = await db
      .select()
      .from(assetReviews)
      .where(eq(assetReviews.assetId, assetId))
      .orderBy(asc(assetReviews.createdAt));
    return NextResponse.json({ reviews }, { status: 200 });
  } catch (error) {
    console.error('GET reviews error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const assetId = parseInt((await params).assetId, 10);
    if (isNaN(assetId)) return NextResponse.json({ error: 'Invalid assetId' }, { status: 400 });

    const rows = await db.select().from(meetingAssets).where(eq(meetingAssets.id, assetId)).limit(1);
    const asset = rows[0];
    if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

    const body = await request.json();
    const reviewerName = typeof body.reviewerName === 'string' ? body.reviewerName.trim() : '';
    const decision = DECISIONS.includes(body.decision) ? body.decision : 'pending';
    if (!reviewerName) return NextResponse.json({ error: 'reviewerName is required' }, { status: 400 });

    // Requesting a revision must include the specific detail of what to change.
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
    if (decision === 'revision_requested' && !notes) {
      return NextResponse.json(
        { error: 'Please describe the specific revision you are requesting.', code: 'REVISION_DETAIL_REQUIRED' },
        { status: 400 },
      );
    }

    const revision = Number.isInteger(body.revision) && body.revision > 0 ? body.revision : asset.revision;

    const inserted = await db
      .insert(assetReviews)
      .values({
        assetId,
        revision,
        reviewerName,
        reviewerEmail: body.reviewerEmail || null,
        decision,
        notes: notes || null,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json({ review: inserted[0] }, { status: 201 });
  } catch (error) {
    console.error('POST review error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

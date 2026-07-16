import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { workScores } from '@/db/schema';
import { desc } from 'drizzle-orm';

/**
 * GET  /api/scores?limit=       -> recent work-card scores
 * POST /api/scores              -> a client scores a piece of work 1-10
 *   Body: { targetType, targetId, score, reviewerName?, comment?, category? }
 *
 * These 1-10 ratings feed the production-insights engine so the team can see
 * what's landing and what needs to improve.
 */
const TARGET_TYPES = ['meeting_asset', 'deliverable', 'deliverable_item'];

export async function GET(request: NextRequest) {
  try {
    const limit = Math.min(parseInt(new URL(request.url).searchParams.get('limit') || '100'), 500);
    const rows = await db.select().from(workScores).orderBy(desc(workScores.createdAt)).limit(limit);
    return NextResponse.json({ scores: rows }, { status: 200 });
  } catch (error) {
    console.error('GET /scores error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const targetType = TARGET_TYPES.includes(body.targetType) ? body.targetType : null;
    const targetId = Number(body.targetId);
    const score = Math.round(Number(body.score));
    if (!targetType) return NextResponse.json({ error: 'invalid targetType' }, { status: 400 });
    if (!Number.isInteger(targetId)) return NextResponse.json({ error: 'targetId is required' }, { status: 400 });
    if (!Number.isInteger(score) || score < 1 || score > 10) {
      return NextResponse.json({ error: 'score must be an integer from 1 to 10' }, { status: 400 });
    }
    const inserted = await db
      .insert(workScores)
      .values({
        targetType,
        targetId,
        score,
        reviewerName: body.reviewerName || null,
        reviewerEmail: body.reviewerEmail || null,
        comment: body.comment || null,
        category: body.category || null,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return NextResponse.json({ score: inserted[0] }, { status: 201 });
  } catch (error) {
    console.error('POST /scores error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { opportunities } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { evaluateOpportunity, type OpportunityCandidate, type OpportunityKind } from '@/lib/prospecting/opportunityFinder';

const VALID_KINDS: OpportunityKind[] = ['affiliate', 'business', 'dropship_niche'];
const now = () => new Date().toISOString();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    let query = db.select().from(opportunities).$dynamic();
    if (status) query = query.where(eq(opportunities.status, status));
    const rows = await query.orderBy(desc(opportunities.score)).limit(100);
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error: ' + error, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

// Add + evaluate a candidate opportunity. The AI scores it and writes a
// rationale + revenue estimate; it is stored as 'discovered'. Enrollment is a
// separate, human action (PATCH status -> 'enrolled').
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { kind, name } = body;
    if (!kind || !VALID_KINDS.includes(kind)) {
      return NextResponse.json({ error: `kind must be one of ${VALID_KINDS.join(', ')}`, code: 'INVALID_KIND' }, { status: 400 });
    }
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required', code: 'MISSING_NAME' }, { status: 400 });
    }

    const candidate: OpportunityCandidate = {
      kind,
      name: name.trim(),
      url: body.url,
      network: body.network,
      category: body.category,
      notes: body.notes,
    };
    const evaluation = await evaluateOpportunity(candidate);

    const inserted = await db
      .insert(opportunities)
      .values({
        kind,
        name: candidate.name,
        url: candidate.url ?? null,
        network: candidate.network ?? null,
        category: candidate.category ?? null,
        description: body.notes ?? null,
        rationale: evaluation.rationale,
        estRevenueLowUsd: evaluation.estRevenueLowUsd,
        estRevenueHighUsd: evaluation.estRevenueHighUsd,
        effortLevel: evaluation.effortLevel,
        score: evaluation.score,
        status: 'discovered',
        source: body.source ?? 'manual',
        createdAt: now(),
        updatedAt: now(),
      })
      .returning();
    return NextResponse.json(inserted[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error: ' + error, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

// Update status (e.g. mark reviewing / enrolled / rejected). Enrollment is
// deliberately a human decision recorded here — the system never auto-enrolls.
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status } = body;
    if (!id || !status) {
      return NextResponse.json({ error: 'id and status are required', code: 'MISSING_FIELDS' }, { status: 400 });
    }
    const valid = ['discovered', 'reviewing', 'enrolled', 'rejected'];
    if (!valid.includes(status)) {
      return NextResponse.json({ error: `status must be one of ${valid.join(', ')}`, code: 'INVALID_STATUS' }, { status: 400 });
    }
    const updated = await db
      .update(opportunities)
      .set({ status, updatedAt: now() })
      .where(eq(opportunities.id, id))
      .returning();
    if (updated.length === 0) {
      return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error: ' + error, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

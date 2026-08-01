import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { deals, pipelineStages } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { ensureDefaultPipeline } from '@/lib/crm';

/**
 * GET  /api/crm/deals   -> all deals (newest first)
 * POST /api/crm/deals   -> create a deal in a stage (defaults to the first)
 */
export async function GET() {
  try {
    const rows = await db.select().from(deals).orderBy(desc(deals.updatedAt)).limit(500);
    return NextResponse.json({ deals: rows }, { status: 200 });
  } catch (error) {
    console.error('GET /crm/deals error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }
    const { pipeline, stages } = await ensureDefaultPipeline();
    const stageId = Number.isInteger(body.stageId) ? body.stageId : stages[0].id;
    const stage = stages.find((s) => s.id === stageId) || stages[0];
    const nowIso = new Date().toISOString();

    const inserted = await db
      .insert(deals)
      .values({
        pipelineId: pipeline.id,
        stageId: stage.id,
        title: body.title.trim(),
        valueCents: Number.isFinite(body.valueCents) ? Math.round(body.valueCents) : 0,
        contactName: body.contactName || null,
        contactEmail: body.contactEmail || null,
        contactPhone: body.contactPhone || null,
        company: body.company || null,
        source: body.source || 'manual',
        notes: body.notes || null,
        status: stage.kind === 'won' ? 'won' : stage.kind === 'lost' ? 'lost' : 'open',
        createdAt: nowIso,
        updatedAt: nowIso,
      })
      .returning();
    return NextResponse.json({ deal: inserted[0] }, { status: 201 });
  } catch (error) {
    console.error('POST /crm/deals error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

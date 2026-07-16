import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { deals, pipelineStages } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * PATCH  /api/crm/deals/[id]  -> move stage (and auto-set won/lost status) or
 *                               edit fields.
 * DELETE /api/crm/deals/[id]  -> remove a deal.
 */
type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const id = parseInt((await params).id, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    const rows = await db.select().from(deals).where(eq(deals.id, id)).limit(1);
    if (!rows[0]) return NextResponse.json({ error: 'Deal not found' }, { status: 404 });

    const body = await request.json();
    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };

    if (Number.isInteger(body.stageId)) {
      const stageRows = await db.select().from(pipelineStages).where(eq(pipelineStages.id, body.stageId)).limit(1);
      const stage = stageRows[0];
      if (!stage) return NextResponse.json({ error: 'Stage not found' }, { status: 400 });
      patch.stageId = stage.id;
      patch.status = stage.kind === 'won' ? 'won' : stage.kind === 'lost' ? 'lost' : 'open';
    }
    for (const f of ['title', 'contactName', 'contactEmail', 'contactPhone', 'company', 'notes', 'source'] as const) {
      if (body[f] !== undefined) patch[f] = body[f];
    }
    if (Number.isFinite(body.valueCents)) patch.valueCents = Math.round(body.valueCents);

    const updated = await db.update(deals).set(patch).where(eq(deals.id, id)).returning();
    return NextResponse.json({ deal: updated[0] }, { status: 200 });
  } catch (error) {
    console.error('PATCH /crm/deals/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const id = parseInt((await params).id, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    await db.delete(deals).where(eq(deals.id, id));
    return NextResponse.json({ deleted: true, id }, { status: 200 });
  } catch (error) {
    console.error('DELETE /crm/deals/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

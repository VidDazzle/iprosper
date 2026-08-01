import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { leads, deals } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ensureDefaultPipeline } from '@/lib/crm';

/**
 * POST /api/crm/leads/[id]/convert
 * Body: { valueCents? }
 * Turns a captured lead into a deal in the first pipeline stage and marks the
 * lead converted (linked to the new deal).
 */
type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const id = parseInt((await params).id, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    const rows = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    const lead = rows[0];
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    if (lead.dealId) return NextResponse.json({ error: 'Lead already converted', dealId: lead.dealId }, { status: 409 });

    const body = await request.json().catch(() => ({}));
    const { pipeline, stages } = await ensureDefaultPipeline();
    const nowIso = new Date().toISOString();

    const inserted = await db
      .insert(deals)
      .values({
        pipelineId: pipeline.id,
        stageId: stages[0].id,
        title: lead.company ? `${lead.company} — ${lead.name}` : lead.name,
        valueCents: Number.isFinite(body.valueCents) ? Math.round(body.valueCents) : 0,
        contactName: lead.name,
        contactEmail: lead.email,
        contactPhone: lead.phone,
        company: lead.company,
        source: lead.source || 'lead',
        notes: lead.message,
        status: 'open',
        createdAt: nowIso,
        updatedAt: nowIso,
      })
      .returning();

    await db.update(leads).set({ status: 'converted', dealId: inserted[0].id }).where(eq(leads.id, id));

    return NextResponse.json({ deal: inserted[0], leadId: id }, { status: 201 });
  } catch (error) {
    console.error('POST /crm/leads/[id]/convert error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

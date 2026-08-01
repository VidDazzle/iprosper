import { NextResponse } from 'next/server';
import { db } from '@/db';
import { deals } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { ensureDefaultPipeline } from '@/lib/crm';

/**
 * GET /api/crm/pipelines
 * Returns the default pipeline, its stages, and the open deals grouped by
 * stage — everything the kanban board needs in one call.
 */
export async function GET() {
  try {
    const { pipeline, stages } = await ensureDefaultPipeline();
    const pipelineDeals = await db
      .select()
      .from(deals)
      .where(eq(deals.pipelineId, pipeline.id))
      .orderBy(desc(deals.updatedAt));

    return NextResponse.json(
      {
        pipeline,
        stages: stages.map((s) => ({
          ...s,
          deals: pipelineDeals.filter((d) => d.stageId === s.id),
        })),
        totalValueCents: pipelineDeals
          .filter((d) => d.status === 'open')
          .reduce((sum, d) => sum + (d.valueCents || 0), 0),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('GET /crm/pipelines error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

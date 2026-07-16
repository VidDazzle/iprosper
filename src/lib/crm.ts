import { db } from '@/db';
import { pipelines, pipelineStages } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

/** Default sales pipeline seeded on first use. */
const DEFAULT_STAGES: { name: string; kind: 'open' | 'won' | 'lost' }[] = [
  { name: 'New Lead', kind: 'open' },
  { name: 'Contacted', kind: 'open' },
  { name: 'Qualified', kind: 'open' },
  { name: 'Proposal', kind: 'open' },
  { name: 'Won', kind: 'won' },
  { name: 'Lost', kind: 'lost' },
];

/**
 * Returns the default pipeline with its stages, creating it the first time so
 * the CRM works out of the box.
 */
export async function ensureDefaultPipeline() {
  const existing = await db.select().from(pipelines).where(eq(pipelines.isDefault, true)).limit(1);
  let pipeline = existing[0];
  const nowIso = new Date().toISOString();

  if (!pipeline) {
    const inserted = await db
      .insert(pipelines)
      .values({ name: 'Sales Pipeline', isDefault: true, createdAt: nowIso })
      .returning();
    pipeline = inserted[0];
    await db.insert(pipelineStages).values(
      DEFAULT_STAGES.map((s, i) => ({
        pipelineId: pipeline!.id,
        name: s.name,
        position: i,
        kind: s.kind,
        createdAt: nowIso,
      })),
    );
  }

  const stages = await db
    .select()
    .from(pipelineStages)
    .where(eq(pipelineStages.pipelineId, pipeline.id))
    .orderBy(asc(pipelineStages.position));

  return { pipeline, stages };
}

export function formatMoney(cents: number, currency = 'usd'): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

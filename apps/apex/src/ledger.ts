import { prisma } from "@apex/db";
import type { LedgerEntry, LedgerSnapshot, Engine } from "@apex/contracts";
import { ENGINES } from "@apex/contracts";

/**
 * Revenue counting rule (spec Section 1): client-services revenue counts
 * when an invoice is paid, affiliate counts on network-confirmed
 * commission, Evolve counts on Stripe settlement. This function does not
 * decide that — it trusts that DispatchJob.revenueAttributed was only
 * ever written by a confirmed-settlement webhook handler (Phase 3). The
 * ledger just sums whatever has already been confirmed; it never counts
 * pending money because pending money is never written to this column.
 */
export async function computeLedger(engineFilter?: Engine): Promise<LedgerSnapshot> {
  const where = engineFilter ? { engine: engineFilter } : {};

  const jobs = await prisma.dispatchJob.findMany({
    where,
    select: {
      engine: true,
      agentId: true,
      costToDate: true,
      revenueAttributed: true,
    },
  });

  const byEngine = aggregate(jobs, (j) => j.engine);
  const byAgent = aggregate(jobs, (j) => `${j.engine}:${j.agentId}`, (j) => j.agentId);

  return {
    generatedAt: new Date().toISOString(),
    byEngine,
    byAgent,
  };
}

function aggregate(
  jobs: { engine: string; agentId: string; costToDate: unknown; revenueAttributed: unknown }[],
  keyFn: (j: (typeof jobs)[number]) => string,
  agentIdFn?: (j: (typeof jobs)[number]) => string,
): LedgerEntry[] {
  const buckets = new Map<
    string,
    { engine: string; agentId?: string; spend: number; revenue: number; jobCount: number }
  >();

  for (const job of jobs) {
    const key = keyFn(job);
    const bucket = buckets.get(key) ?? {
      engine: job.engine,
      agentId: agentIdFn?.(job),
      spend: 0,
      revenue: 0,
      jobCount: 0,
    };
    bucket.spend += Number(job.costToDate);
    bucket.revenue += Number(job.revenueAttributed);
    bucket.jobCount += 1;
    buckets.set(key, bucket);
  }

  return Array.from(buckets.entries()).map(([key, b]) => ({
    key,
    engine: b.engine as Engine,
    agentId: b.agentId,
    spend: round2(b.spend),
    revenue: round2(b.revenue),
    pnl: round2(b.revenue - b.spend),
    jobCount: b.jobCount,
  }));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Convenience helper: guarantees a zero-row for every engine, even ones with no jobs yet. */
export async function computeLedgerWithZeroFill(): Promise<LedgerSnapshot> {
  const snapshot = await computeLedger();
  const present = new Set(snapshot.byEngine.map((e) => e.engine));
  for (const engine of ENGINES) {
    if (!present.has(engine)) {
      snapshot.byEngine.push({
        key: engine,
        engine,
        spend: 0,
        revenue: 0,
        pnl: 0,
        jobCount: 0,
      });
    }
  }
  return snapshot;
}

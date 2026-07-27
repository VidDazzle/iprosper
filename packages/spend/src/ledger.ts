import { prisma } from "@apex/db";
import type { LedgerEntry, LedgerSnapshot, PortfolioSummary, Engine } from "@apex/contracts";
import { ENGINES } from "@apex/contracts";

/**
 * Revenue counting rule (spec Section 1): client-services revenue counts
 * when an invoice is paid, affiliate counts on network-confirmed
 * commission, Evolve counts on Stripe settlement. This function does not
 * decide that — it trusts that DispatchJob.revenueAttributed was only
 * ever written by a confirmed-settlement webhook handler (Phase 3). The
 * ledger just sums whatever has already been confirmed; it never counts
 * pending money because pending money is never written to this column.
 *
 * Shared package (not inside apps/apex) so apps/web's admin dashboard
 * can call the exact same computation apex.ledger uses, rather than
 * duplicating the aggregation with its own query.
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
      budgetCap: true,
    },
  });

  const byEngine = aggregate(jobs, (j) => j.engine);
  const byAgent = aggregate(jobs, (j) => `${j.engine}:${j.agentId}`, (j) => j.agentId);
  const portfolio = summarizePortfolio(jobs);

  return {
    generatedAt: new Date().toISOString(),
    portfolio,
    byEngine,
    byAgent,
  };
}

type JobRow = { engine: string; agentId: string; costToDate: unknown; revenueAttributed: unknown; budgetCap: unknown };

function aggregate(
  jobs: JobRow[],
  keyFn: (j: JobRow) => string,
  agentIdFn?: (j: JobRow) => string,
): LedgerEntry[] {
  const buckets = new Map<
    string,
    { engine: string; agentId?: string; spend: number; revenue: number; jobCount: number; budgetAllocated: number }
  >();

  for (const job of jobs) {
    const key = keyFn(job);
    const bucket = buckets.get(key) ?? {
      engine: job.engine,
      agentId: agentIdFn?.(job),
      spend: 0,
      revenue: 0,
      jobCount: 0,
      budgetAllocated: 0,
    };
    bucket.spend += Number(job.costToDate);
    bucket.revenue += Number(job.revenueAttributed);
    bucket.budgetAllocated += Number(job.budgetCap);
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
    budgetAllocated: round2(b.budgetAllocated),
    creditRemaining: round2(b.budgetAllocated - b.spend),
    marginPercent: percent(b.revenue - b.spend, b.revenue),
    roiPercent: percent(b.revenue - b.spend, b.spend),
  }));
}

/** Null (not 0) when the denominator is zero — "no data yet" is not the same as "0%." */
function percent(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return round2((numerator / denominator) * 100);
}

/**
 * Grand total across everything the engine/agent filters would
 * otherwise split apart — "credit used, total spend, profit and
 * revenue" as one headline figure, not just per-engine breakdown.
 */
function summarizePortfolio(jobs: JobRow[]): PortfolioSummary {
  let spend = 0;
  let revenue = 0;
  let budgetAllocated = 0;
  for (const job of jobs) {
    spend += Number(job.costToDate);
    revenue += Number(job.revenueAttributed);
    budgetAllocated += Number(job.budgetCap);
  }
  return {
    spend: round2(spend),
    revenue: round2(revenue),
    pnl: round2(revenue - spend),
    jobCount: jobs.length,
    budgetAllocated: round2(budgetAllocated),
    creditRemaining: round2(budgetAllocated - spend),
    marginPercent: percent(revenue - spend, revenue),
    roiPercent: percent(revenue - spend, spend),
  };
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
        budgetAllocated: 0,
        creditRemaining: 0,
        marginPercent: null,
        roiPercent: null,
      });
    }
  }
  return snapshot;
}

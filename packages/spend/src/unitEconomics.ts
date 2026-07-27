import { prisma } from "@apex/db";
import { loadEnv } from "@apex/config";
import type { Engine } from "@apex/contracts";

export interface UnitEconomics {
  closedDealCount: number;
  eligible: boolean;
  avgRevenuePerClose: number | null;
  avgCostPerClose: number | null;
  realizedMarginPercent: number | null;
}

/**
 * Real, realized unit economics — no invented numbers, no candidate
 * revenue projections. Explicit decision: "profit and revenue should
 * always be expressed in a percentage, not a fixed cost... you do not
 * need to know the exact price at this time." Gated by a minimum
 * closed-deal sample size (same reasoning as
 * packages/pipeline/socialProof.ts) — a single early close can't be
 * trusted as "the" per-customer economics.
 *
 * avgCostPerClose is a BLENDED cost — total spend across every job for
 * this engine (closed AND never-closed) divided by the number that
 * DID close. That's the real cost of acquiring one paying customer,
 * including everything spent on prospects who said no — not just the
 * winning job's own line-item cost.
 */
export async function getRealizedUnitEconomics(engine?: Engine): Promise<UnitEconomics> {
  const env = loadEnv();
  const where = engine ? { engine } : {};

  const [totals, closed] = await Promise.all([
    prisma.dispatchJob.aggregate({ where, _sum: { costToDate: true } }),
    prisma.dispatchJob.aggregate({
      where: { ...where, invoicePaid: true },
      _sum: { revenueAttributed: true },
      _count: { _all: true },
    }),
  ]);

  const closedDealCount = closed._count._all;
  const eligible = closedDealCount >= env.UNIT_ECONOMICS_MIN_SAMPLE;

  if (!eligible) {
    return { closedDealCount, eligible: false, avgRevenuePerClose: null, avgCostPerClose: null, realizedMarginPercent: null };
  }

  const totalSpend = Number(totals._sum.costToDate ?? 0);
  const totalClosedRevenue = Number(closed._sum.revenueAttributed ?? 0);

  const avgRevenuePerClose = round2(totalClosedRevenue / closedDealCount);
  const avgCostPerClose = round2(totalSpend / closedDealCount);
  const realizedMarginPercent =
    avgRevenuePerClose > 0 ? round2(((avgRevenuePerClose - avgCostPerClose) / avgRevenuePerClose) * 100) : null;

  return { closedDealCount, eligible: true, avgRevenuePerClose, avgCostPerClose, realizedMarginPercent };
}

/**
 * price such that (price - cost) / price = targetMargin
 *   => price = cost / (1 - targetMargin)
 * Pure function, split out for unit testing without a DB.
 */
export function suggestedMinimumPrice(avgCostPerClose: number, targetMarginPercent: number): number {
  if (targetMarginPercent >= 100 || targetMarginPercent < 0) {
    throw new Error(`targetMarginPercent must be in [0, 100), got ${targetMarginPercent}`);
  }
  const marginFraction = targetMarginPercent / 100;
  return round2(avgCostPerClose / (1 - marginFraction));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

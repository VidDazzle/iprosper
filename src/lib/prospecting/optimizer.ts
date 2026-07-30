// Autonomous performance optimizer. Reads outreach outcomes, computes a
// per-product performance score (revenue + conversion, penalized by
// complaints), writes it back as `priorityScore`, and pauses chronic
// non-sellers that are still `autoManaged`. Winners float to the top of the
// matcher via priorityScore; losers get deactivated so promotion effort
// concentrates on what sells.

import { db } from '@/db';
import { products, outreachMessages, outreachOutcomes, auditLog } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

const now = () => new Date().toISOString();

export interface ProductPerformance {
  productId: number;
  title: string;
  sent: number;
  clicks: number;
  conversions: number;
  complaints: number;
  revenueUsd: number;
  conversionRate: number;
  score: number; // 0..100 performance score
}

export interface OptimizeResult {
  evaluated: number;
  paused: number;
  reactivated: number;
  performance: ProductPerformance[];
}

/**
 * Weighted performance score. Revenue dominates; conversion rate and clicks add
 * signal; complaints subtract hard. Products with too little data keep a
 * neutral score so we don't prematurely kill something untested.
 */
function computeScore(p: Omit<ProductPerformance, 'score' | 'conversionRate'> & { conversionRate: number }): number {
  if (p.sent < MIN_SENDS_FOR_JUDGMENT) return NEUTRAL_SCORE;
  const revenueScore = Math.min(60, p.revenueUsd / 5); // $300 rev => full 60
  const convScore = Math.min(30, p.conversionRate * 300); // 10% conv => full 30
  const clickScore = Math.min(10, (p.clicks / Math.max(1, p.sent)) * 50);
  const complaintPenalty = p.complaints * 15;
  return Math.max(0, Math.min(100, revenueScore + convScore + clickScore - complaintPenalty));
}

const MIN_SENDS_FOR_JUDGMENT = 10;
const NEUTRAL_SCORE = 40;
const PAUSE_THRESHOLD = 15; // below this (with enough data) => pause
const REACTIVATE_THRESHOLD = 45;

export async function runOptimizer(): Promise<OptimizeResult> {
  const all = await db.select().from(products);

  // Aggregate outcomes per product in one pass.
  const rows = await db
    .select({
      productId: outreachMessages.productId,
      outcome: outreachOutcomes.outcome,
      count: sql<number>`count(*)`,
      revenue: sql<number>`coalesce(sum(${outreachOutcomes.revenueUsd}),0)`,
    })
    .from(outreachMessages)
    .leftJoin(outreachOutcomes, eq(outreachOutcomes.outreachId, outreachMessages.id))
    .groupBy(outreachMessages.productId, outreachOutcomes.outcome);

  // Count sends per product separately (sent messages, regardless of outcome).
  const sentRows = await db
    .select({ productId: outreachMessages.productId, sent: sql<number>`count(*)` })
    .from(outreachMessages)
    .where(eq(outreachMessages.status, 'sent'))
    .groupBy(outreachMessages.productId);
  const sentByProduct = new Map(sentRows.map((r) => [r.productId, Number(r.sent)]));

  const perf = new Map<number, ProductPerformance>();
  for (const product of all) {
    perf.set(product.id, {
      productId: product.id,
      title: product.title,
      sent: sentByProduct.get(product.id) ?? 0,
      clicks: 0,
      conversions: 0,
      complaints: 0,
      revenueUsd: 0,
      conversionRate: 0,
      score: NEUTRAL_SCORE,
    });
  }

  for (const r of rows) {
    if (r.productId == null) continue;
    const p = perf.get(r.productId);
    if (!p) continue;
    const c = Number(r.count);
    switch (r.outcome) {
      case 'click':
        p.clicks += c;
        break;
      case 'conversion':
        p.conversions += c;
        p.revenueUsd += Number(r.revenue);
        break;
      case 'complaint':
      case 'block':
        p.complaints += c;
        break;
    }
  }

  let paused = 0;
  let reactivated = 0;

  for (const product of all) {
    const p = perf.get(product.id)!;
    p.conversionRate = p.sent > 0 ? p.conversions / p.sent : 0;
    p.score = computeScore(p);

    const updates: Partial<typeof products.$inferInsert> = { priorityScore: p.score, updatedAt: now() };

    if (product.autoManaged) {
      if (product.active && p.sent >= MIN_SENDS_FOR_JUDGMENT && p.score < PAUSE_THRESHOLD) {
        updates.active = false;
        paused += 1;
        await db.insert(auditLog).values({ actor: 'optimizer', action: 'product_paused', entityType: 'product', entityId: product.id, detail: `score ${p.score.toFixed(1)}`, createdAt: now() });
      } else if (!product.active && p.score >= REACTIVATE_THRESHOLD) {
        updates.active = true;
        reactivated += 1;
        await db.insert(auditLog).values({ actor: 'optimizer', action: 'product_reactivated', entityType: 'product', entityId: product.id, detail: `score ${p.score.toFixed(1)}`, createdAt: now() });
      }
    }

    await db.update(products).set(updates).where(eq(products.id, product.id));
  }

  const performance = [...perf.values()].sort((a, b) => b.score - a.score);
  return { evaluated: all.length, paused, reactivated, performance };
}

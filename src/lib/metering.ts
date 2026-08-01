import { db } from '@/db';
import { billingAccounts, plans, productSubscriptions, usageEvents } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { PRICING, PRODUCTS, Product, MIN_MARGIN } from '@/lib/pricing';

/** Current calendar-month billing period in UTC. */
function currentPeriod(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

function tierConfig(product: Product, tier: string) {
  return PRICING[product].tiers.find((t) => t.tier === tier) || PRICING[product].tiers[0];
}

/** Amortized revenue per included unit (>= cost*(1+margin) by assertProfitable). */
function includedUnitPrice(product: Product, tier: string): number {
  const t = tierConfig(product, tier);
  return t.includedUnits > 0 ? t.monthlyPriceCents / t.includedUnits : 0;
}

/**
 * Seed the plan catalog into the DB from the pricing config (idempotent).
 * Seeds only rows that are missing, so adding a new product (e.g. Orbit) later
 * back-fills its plans without disturbing existing ones.
 */
export async function ensurePlansSeeded(): Promise<void> {
  const existing = await db.select({ product: plans.product, tier: plans.tier }).from(plans);
  const have = new Set(existing.map((r) => `${r.product}:${r.tier}`));
  const nowIso = new Date().toISOString();
  const rows: (typeof plans.$inferInsert)[] = [];
  for (const product of PRODUCTS) {
    const p = PRICING[product];
    for (const t of p.tiers) {
      if (have.has(`${product}:${t.tier}`)) continue;
      rows.push({
        product,
        tier: t.tier,
        name: t.name,
        monthlyPriceCents: t.monthlyPriceCents,
        includedUnits: t.includedUnits,
        unitLabel: p.unitLabel,
        active: true,
        createdAt: nowIso,
      });
    }
  }
  if (rows.length) await db.insert(plans).values(rows);
}

export async function getPrimaryAccount() {
  const existing = await db.select().from(billingAccounts).where(eq(billingAccounts.isPrimary, true)).limit(1);
  if (existing[0]) return existing[0];
  const inserted = await db
    .insert(billingAccounts)
    .values({ name: 'Evolve', email: null, isPrimary: true, createdAt: new Date().toISOString() })
    .returning();
  return inserted[0];
}

/** Get (or create/roll over) the subscription for an account + product. */
export async function ensureSubscription(accountId: number, product: Product, tier: string = 'starter') {
  const rows = await db
    .select()
    .from(productSubscriptions)
    .where(and(eq(productSubscriptions.accountId, accountId), eq(productSubscriptions.product, product)))
    .limit(1);
  const period = currentPeriod();
  const nowIso = new Date().toISOString();

  if (!rows[0]) {
    const t = tierConfig(product, tier);
    const inserted = await db
      .insert(productSubscriptions)
      .values({
        accountId,
        product,
        tier: t.tier,
        includedUnits: t.includedUnits,
        usedUnits: 0,
        extraCredits: 0,
        periodStart: period.start,
        periodEnd: period.end,
        status: 'active',
        createdAt: nowIso,
        updatedAt: nowIso,
      })
      .returning();
    return inserted[0];
  }

  const sub = rows[0];
  // Roll over into a new month: reset used units, keep prepaid credits.
  if (new Date().toISOString() >= sub.periodEnd) {
    const updated = await db
      .update(productSubscriptions)
      .set({ usedUnits: 0, periodStart: period.start, periodEnd: period.end, updatedAt: nowIso })
      .where(eq(productSubscriptions.id, sub.id))
      .returning();
    return updated[0];
  }
  return sub;
}

export interface UsageSnapshot {
  product: Product;
  label: string;
  unitLabel: string;
  tier: string;
  includedUnits: number;
  usedUnits: number;
  extraCredits: number;
  remaining: number;
  pctUsed: number; // 0-100 of included allowance
  capReached: boolean;
  overagePriceCents: number;
  periodEnd: string;
}

export async function getUsage(accountId: number, product: Product): Promise<UsageSnapshot> {
  const sub = await ensureSubscription(accountId, product);
  const remainingIncluded = Math.max(0, sub.includedUnits - sub.usedUnits);
  const remaining = remainingIncluded + sub.extraCredits;
  return {
    product,
    label: PRICING[product].label,
    unitLabel: PRICING[product].unitLabel,
    tier: sub.tier,
    includedUnits: sub.includedUnits,
    usedUnits: sub.usedUnits,
    extraCredits: sub.extraCredits,
    remaining,
    pctUsed: sub.includedUnits > 0 ? Math.min(100, Math.round((sub.usedUnits / sub.includedUnits) * 100)) : 0,
    capReached: remaining <= 0,
    overagePriceCents: PRICING[product].overagePriceCentsPerUnit,
    periodEnd: sub.periodEnd,
  };
}

export async function getAllUsage(accountId: number): Promise<UsageSnapshot[]> {
  return Promise.all(PRODUCTS.map((p) => getUsage(accountId, p)));
}

export interface MeterResult {
  allowed: boolean;
  capReached: boolean;
  product: Product;
  remaining: number;
  usedUnits: number;
  includedUnits: number;
  extraCredits: number;
  message?: string;
}

/**
 * Charge `units` of metered usage. Returns allowed:false WITHOUT recording
 * anything when the account is out of allowance + credits — the caller must then
 * refuse the costly work (return 402). This is the hard cap that guarantees we
 * never do paid work for free.
 */
export async function meter(
  accountId: number,
  product: Product,
  kind: string,
  units = 1,
): Promise<MeterResult> {
  const sub = await ensureSubscription(accountId, product);
  const remainingIncluded = Math.max(0, sub.includedUnits - sub.usedUnits);
  const totalRemaining = remainingIncluded + sub.extraCredits;

  if (units > totalRemaining) {
    return {
      allowed: false,
      capReached: true,
      product,
      remaining: totalRemaining,
      usedUnits: sub.usedUnits,
      includedUnits: sub.includedUnits,
      extraCredits: sub.extraCredits,
      message: 'Monthly cap reached. Buy credits or upgrade to continue.',
    };
  }

  const fromIncluded = Math.min(units, remainingIncluded);
  const fromCredits = units - fromIncluded;
  const cost = units * PRICING[product].costCentsPerUnit;
  const price =
    Math.round(fromIncluded * includedUnitPrice(product, sub.tier)) +
    fromCredits * PRICING[product].overagePriceCentsPerUnit;

  const nowIso = new Date().toISOString();
  await db
    .update(productSubscriptions)
    .set({ usedUnits: sub.usedUnits + fromIncluded, extraCredits: sub.extraCredits - fromCredits, updatedAt: nowIso })
    .where(eq(productSubscriptions.id, sub.id));

  await db.insert(usageEvents).values({
    accountId,
    product,
    kind,
    units,
    costCents: cost,
    priceCents: price,
    source: fromCredits > 0 ? 'credit' : 'included',
    createdAt: nowIso,
  });

  const newRemaining = totalRemaining - units;
  return {
    allowed: true,
    capReached: newRemaining <= 0,
    product,
    remaining: newRemaining,
    usedUnits: sub.usedUnits + fromIncluded,
    includedUnits: sub.includedUnits,
    extraCredits: sub.extraCredits - fromCredits,
  };
}

/** Add prepaid overage credits (after a paid credit purchase). */
export async function grantCredits(accountId: number, product: Product, units: number): Promise<void> {
  const sub = await ensureSubscription(accountId, product);
  await db
    .update(productSubscriptions)
    .set({ extraCredits: sub.extraCredits + units, updatedAt: new Date().toISOString() })
    .where(eq(productSubscriptions.id, sub.id));
}

/** Change an account's plan tier for a product (upgrade/downgrade). */
export async function setTier(accountId: number, product: Product, tier: string): Promise<void> {
  const t = tierConfig(product, tier);
  const sub = await ensureSubscription(accountId, product);
  await db
    .update(productSubscriptions)
    .set({ tier: t.tier, includedUnits: t.includedUnits, updatedAt: new Date().toISOString() })
    .where(eq(productSubscriptions.id, sub.id));
}

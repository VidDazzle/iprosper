/**
 * Pricing & the profit guarantee.
 *
 * "Evolve must always make a profit — never lose money." That rule is enforced
 * here in three ways:
 *   1. Every unit's SALE price (plan allowance + overage credit) must be at
 *      least its underlying COST times (1 + MIN_MARGIN). `assertProfitable()`
 *      throws if any configured price would lose money — it runs at module load
 *      and in tests, so an unprofitable price can't ship.
 *   2. Usage is prepaid and hard-capped (see metering.ts): once the paid
 *      allowance + credits are exhausted, costly work is blocked, so Evolve
 *      never incurs cost it hasn't already been paid for.
 *   3. Every metered event stores cost and price, so realized margin is
 *      provable and the audit can alarm if it ever thins (see security-audit).
 */

export type Product = 'calendar' | 'email' | 'meet';
export const PRODUCTS: Product[] = ['calendar', 'email', 'meet'];

/** Minimum gross margin over cost (0.5 = 50% markup floor). Override with env. */
export const MIN_MARGIN = Number(process.env.MIN_MARGIN || 0.5);

export interface ProductPricing {
  label: string;
  unitLabel: string;
  /** Conservative internal cost per metered unit, in cents. */
  costCentsPerUnit: number;
  /** Sale price of one overage credit (must clear the margin floor). */
  overagePriceCentsPerUnit: number;
  /** Credit packs offered when a user hits their cap. */
  creditPacks: { units: number; priceCents: number }[];
  tiers: {
    tier: 'starter' | 'pro' | 'business';
    name: string;
    monthlyPriceCents: number;
    includedUnits: number;
  }[];
}

export const PRICING: Record<Product, ProductPricing> = {
  calendar: {
    label: 'Evolve Calendar',
    unitLabel: 'AI scheduling actions',
    costCentsPerUnit: 3,
    overagePriceCentsPerUnit: 15,
    creditPacks: [
      { units: 100, priceCents: 1500 },
      { units: 500, priceCents: 6000 },
    ],
    tiers: [
      { tier: 'starter', name: 'Starter', monthlyPriceCents: 1900, includedUnits: 100 },
      { tier: 'pro', name: 'Pro', monthlyPriceCents: 4900, includedUnits: 500 },
      { tier: 'business', name: 'Business', monthlyPriceCents: 14900, includedUnits: 2000 },
    ],
  },
  email: {
    label: 'Evolve Mail',
    unitLabel: 'AI email actions',
    costCentsPerUnit: 1,
    overagePriceCentsPerUnit: 5,
    creditPacks: [
      { units: 1000, priceCents: 5000 },
      { units: 5000, priceCents: 20000 },
    ],
    tiers: [
      { tier: 'starter', name: 'Starter', monthlyPriceCents: 2900, includedUnits: 1000 },
      { tier: 'pro', name: 'Pro', monthlyPriceCents: 7900, includedUnits: 5000 },
      { tier: 'business', name: 'Business', monthlyPriceCents: 19900, includedUnits: 12000 },
    ],
  },
  meet: {
    label: 'Evolve Meet',
    unitLabel: 'AI meeting actions',
    costCentsPerUnit: 3,
    overagePriceCentsPerUnit: 12,
    creditPacks: [
      { units: 100, priceCents: 1200 },
      { units: 500, priceCents: 5500 },
    ],
    tiers: [
      { tier: 'starter', name: 'Starter', monthlyPriceCents: 3900, includedUnits: 500 },
      { tier: 'pro', name: 'Pro', monthlyPriceCents: 9900, includedUnits: 2000 },
      { tier: 'business', name: 'Business', monthlyPriceCents: 29900, includedUnits: 6000 },
    ],
  },
};

export interface MarginViolation {
  product: Product;
  where: string;
  costCents: number;
  priceCents: number;
  requiredCents: number;
}

/** Returns every price that fails the margin floor. Empty = all profitable. */
export function findMarginViolations(): MarginViolation[] {
  const out: MarginViolation[] = [];
  for (const product of PRODUCTS) {
    const p = PRICING[product];
    const floorUnit = p.costCentsPerUnit * (1 + MIN_MARGIN);

    // Overage credit price must clear the per-unit floor.
    if (p.overagePriceCentsPerUnit < floorUnit) {
      out.push({ product, where: 'overage', costCents: p.costCentsPerUnit, priceCents: p.overagePriceCentsPerUnit, requiredCents: floorUnit });
    }
    // Each credit pack must clear cost-of-goods for its units.
    for (const pack of p.creditPacks) {
      const packFloor = pack.units * p.costCentsPerUnit * (1 + MIN_MARGIN);
      if (pack.priceCents < packFloor) {
        out.push({ product, where: `pack:${pack.units}`, costCents: pack.units * p.costCentsPerUnit, priceCents: pack.priceCents, requiredCents: packFloor });
      }
    }
    // Each plan's monthly price must exceed the cost of its full allowance.
    for (const t of p.tiers) {
      const planFloor = t.includedUnits * p.costCentsPerUnit * (1 + MIN_MARGIN);
      if (t.monthlyPriceCents < planFloor) {
        out.push({ product, where: `plan:${t.tier}`, costCents: t.includedUnits * p.costCentsPerUnit, priceCents: t.monthlyPriceCents, requiredCents: planFloor });
      }
    }
  }
  return out;
}

/** Throws if any configured price would lose money. Runs at import time. */
export function assertProfitable(): void {
  const violations = findMarginViolations();
  if (violations.length > 0) {
    throw new Error(
      `Pricing would lose money — margin floor (${MIN_MARGIN}) violated: ` +
        violations.map((v) => `${v.product}/${v.where} price ${v.priceCents}¢ < required ${Math.ceil(v.requiredCents)}¢`).join('; '),
    );
  }
}

// Fail fast: never boot with an unprofitable price sheet.
assertProfitable();

export function unitPrice(product: Product): number {
  return PRICING[product].overagePriceCentsPerUnit;
}
export function unitCost(product: Product): number {
  return PRICING[product].costCentsPerUnit;
}

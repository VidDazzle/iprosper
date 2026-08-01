import { NextResponse } from 'next/server';
import { db } from '@/db';
import { usageEvents } from '@/db/schema';
import { findMarginViolations, MIN_MARGIN } from '@/lib/pricing';

/**
 * GET /api/billing/margin
 * Proves the profit guarantee: total revenue vs total cost across all metered
 * usage, plus any pricing-config violations of the margin floor. Used by the
 * dashboard and the security audit's margin alarm.
 */
export async function GET() {
  try {
    const events = await db
      .select({ cost: usageEvents.costCents, price: usageEvents.priceCents })
      .from(usageEvents);
    const totalCostCents = events.reduce((s, e) => s + e.cost, 0);
    const totalRevenueCents = events.reduce((s, e) => s + e.price, 0);
    const marginCents = totalRevenueCents - totalCostCents;

    const violations = findMarginViolations();

    return NextResponse.json(
      {
        events: events.length,
        totalCostCents,
        totalRevenueCents,
        marginCents,
        marginRatio: totalCostCents > 0 ? Number((marginCents / totalCostCents).toFixed(2)) : null,
        minMargin: MIN_MARGIN,
        profitable: marginCents >= 0 && violations.length === 0,
        pricingViolations: violations,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('GET /billing/margin error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

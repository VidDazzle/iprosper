import { NextResponse } from 'next/server';
import { PRICING, PRODUCTS } from '@/lib/pricing';
import { ensurePlansSeeded } from '@/lib/metering';

/**
 * GET /api/billing/plans
 * The public price sheet for the three Evolve products (for the sales page).
 */
export async function GET() {
  try {
    await ensurePlansSeeded();
    const products = PRODUCTS.map((product) => {
      const p = PRICING[product];
      return {
        product,
        label: p.label,
        unitLabel: p.unitLabel,
        overagePriceCents: p.overagePriceCentsPerUnit,
        creditPacks: p.creditPacks,
        tiers: p.tiers,
      };
    });
    return NextResponse.json({ products }, { status: 200 });
  } catch (error) {
    console.error('GET /billing/plans error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

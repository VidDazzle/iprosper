import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAgent } from '@/lib/voice-auth';
import { getPrimaryAccount, grantCredits } from '@/lib/metering';
import { PRODUCTS, Product } from '@/lib/pricing';

/**
 * POST /api/billing/credits/grant
 * Body: { product, units, accountId? }
 *
 * Directly grants prepaid credits. Authorized for the agent/admin (or cron
 * secret) — used for manual fulfillment and by the payment webhook after a
 * confirmed purchase. Never public: granting credits without payment would
 * lose money.
 */
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  const authorized = (cronSecret && auth === `Bearer ${cronSecret}`) || isAuthorizedAgent(request);
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const product = body.product as Product;
    const units = Math.round(Number(body.units));
    if (!PRODUCTS.includes(product)) return NextResponse.json({ error: 'invalid product' }, { status: 400 });
    if (!Number.isInteger(units) || units <= 0) return NextResponse.json({ error: 'units must be positive' }, { status: 400 });

    const accountId = Number.isInteger(body.accountId) ? body.accountId : (await getPrimaryAccount()).id;
    await grantCredits(accountId, product, units);
    return NextResponse.json({ granted: true, accountId, product, units }, { status: 200 });
  } catch (error) {
    console.error('POST /billing/credits/grant error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

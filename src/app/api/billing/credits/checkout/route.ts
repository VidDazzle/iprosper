import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { orders } from '@/db/schema';
import { PRICING, PRODUCTS, Product } from '@/lib/pricing';
import { getPrimaryAccount } from '@/lib/metering';
import { createCheckoutSession, stripeConfigured } from '@/lib/checkout';

/**
 * POST /api/billing/credits/checkout
 * Body: { product, units, buyerEmail? }
 *
 * Buy additional metered credits when a cap is reached. Priced at the product's
 * overage rate (which clears the margin floor), so every credit sale is
 * profitable. With Stripe configured, returns a hosted checkout URL and the
 * webhook grants the credits on payment; otherwise records a pending order.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const product = body.product as Product;
    const units = Math.round(Number(body.units));
    if (!PRODUCTS.includes(product)) return NextResponse.json({ error: 'invalid product' }, { status: 400 });
    if (!Number.isInteger(units) || units <= 0) return NextResponse.json({ error: 'units must be a positive integer' }, { status: 400 });

    const priceCents = units * PRICING[product].overagePriceCentsPerUnit;
    const account = await getPrimaryAccount();
    const nowIso = new Date().toISOString();

    const inserted = await db
      .insert(orders)
      .values({
        productId: 0, // sentinel: this is a credit purchase, not a catalog product
        buyerEmail: body.buyerEmail ? String(body.buyerEmail).trim().toLowerCase() : null,
        amountCents: priceCents,
        currency: 'usd',
        status: 'pending',
        provider: stripeConfigured() ? 'stripe' : 'manual',
        sourceContext: JSON.stringify({ kind: 'credits', product, units, accountId: account.id }),
        createdAt: nowIso,
      })
      .returning();
    const order = inserted[0];

    const origin = new URL(request.url).origin;
    const url = await createCheckoutSession({
      orderId: order.id,
      productName: `${units.toLocaleString()} ${PRICING[product].label} credits`,
      amountCents: priceCents,
      currency: 'usd',
      buyerEmail: order.buyerEmail,
      origin,
    });

    if (url) return NextResponse.json({ orderId: order.id, checkoutUrl: url, provider: 'stripe', priceCents }, { status: 201 });
    return NextResponse.json(
      { orderId: order.id, provider: 'manual', priceCents, note: 'Stripe not configured — order pending. Credits are granted on payment.' },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /billing/credits/checkout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

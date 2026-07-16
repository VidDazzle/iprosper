import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { products, orders } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createCheckoutSession, stripeConfigured } from '@/lib/checkout';

/**
 * POST /api/checkout
 * Body: { productId | slug, buyerName?, buyerEmail?, sourceContext? }
 *
 * Creates a pending order and, if Stripe is configured, returns a hosted
 * Checkout URL to redirect the buyer to. Otherwise returns the order in manual
 * mode. `sourceContext` lets a webinar/meeting record where the sale came from.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const key = body.productId ?? body.slug;
    if (key === undefined) return NextResponse.json({ error: 'productId or slug is required' }, { status: 400 });

    const asId = parseInt(String(key), 10);
    let product;
    if (!isNaN(asId) && String(asId) === String(key)) {
      product = (await db.select().from(products).where(eq(products.id, asId)).limit(1))[0];
    }
    if (!product) {
      product = (await db.select().from(products).where(eq(products.slug, String(key))).limit(1))[0];
    }
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    if (!product.active) return NextResponse.json({ error: 'Product is not available' }, { status: 400 });

    const inserted = await db
      .insert(orders)
      .values({
        productId: product.id,
        buyerName: body.buyerName || null,
        buyerEmail: body.buyerEmail ? String(body.buyerEmail).trim().toLowerCase() : null,
        amountCents: product.priceCents,
        currency: product.currency,
        status: 'pending',
        provider: stripeConfigured() ? 'stripe' : 'manual',
        sourceContext: body.sourceContext || null,
        createdAt: new Date().toISOString(),
      })
      .returning();
    const order = inserted[0];

    const origin = new URL(request.url).origin;
    const url = await createCheckoutSession({
      orderId: order.id,
      productName: product.name,
      amountCents: product.priceCents,
      currency: product.currency,
      buyerEmail: order.buyerEmail,
      origin,
    });

    if (url) {
      return NextResponse.json({ orderId: order.id, checkoutUrl: url, provider: 'stripe' }, { status: 201 });
    }
    return NextResponse.json(
      {
        orderId: order.id,
        provider: 'manual',
        note: 'Stripe not configured — order recorded as pending. Set STRIPE_SECRET_KEY to take live payments.',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /checkout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

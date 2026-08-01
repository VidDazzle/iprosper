import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { orders } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyStripeSignature } from '@/lib/checkout';
import { grantCredits } from '@/lib/metering';
import { PRODUCTS, Product } from '@/lib/pricing';

/**
 * POST /api/checkout/webhook
 * Stripe posts here when a Checkout Session completes. We verify the signature
 * (HMAC over the raw body) before trusting it, then mark the order paid.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.text(); // raw body for signature verification
    const sig = request.headers.get('stripe-signature');
    if (!verifyStripeSignature(payload, sig)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(payload);
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data?.object || {};
      const orderId = parseInt(session.client_reference_id || session.metadata?.order_id || '', 10);
      if (!isNaN(orderId)) {
        const rows = await db
          .update(orders)
          .set({ status: 'paid', providerRef: session.id || null })
          .where(eq(orders.id, orderId))
          .returning();
        // If this was a credit purchase, grant the credits now that it's paid.
        const order = rows[0];
        if (order?.sourceContext) {
          try {
            const meta = JSON.parse(order.sourceContext);
            if (meta.kind === 'credits' && PRODUCTS.includes(meta.product as Product) && meta.units > 0) {
              await grantCredits(meta.accountId, meta.product, meta.units);
            }
          } catch {
            /* not a credit order */
          }
        }
      }
    }
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('POST /checkout/webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import crypto from 'node:crypto';

/**
 * Checkout via Stripe when configured, with a graceful manual fallback.
 *
 * If STRIPE_SECRET_KEY is set, we create a real Stripe Checkout Session (using
 * Stripe's REST API directly — no SDK dependency) and return its hosted URL to
 * redirect the buyer to. Without it, the order is recorded as pending and the
 * page shows manual-payment instructions, so the flow works end-to-end before
 * payments are wired up.
 */

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export interface CheckoutInput {
  orderId: number;
  productName: string;
  amountCents: number;
  currency: string;
  buyerEmail?: string | null;
  origin: string;
}

/** Returns the hosted Stripe Checkout URL, or null if Stripe isn't configured. */
export async function createCheckoutSession(input: CheckoutInput): Promise<string | null> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;

  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('success_url', `${input.origin}/buy/success?order=${input.orderId}`);
  params.set('cancel_url', `${input.origin}/buy/cancel?order=${input.orderId}`);
  params.set('client_reference_id', String(input.orderId));
  params.set('metadata[order_id]', String(input.orderId));
  if (input.buyerEmail) params.set('customer_email', input.buyerEmail);
  params.set('line_items[0][quantity]', '1');
  params.set('line_items[0][price_data][currency]', input.currency);
  params.set('line_items[0][price_data][unit_amount]', String(input.amountCents));
  params.set('line_items[0][price_data][product_data][name]', input.productName);

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  if (!res.ok) {
    console.error('Stripe checkout error:', res.status, await res.text());
    return null;
  }
  const data = await res.json();
  return data.url || null;
}

/**
 * Verify a Stripe webhook signature (HMAC-SHA256 over `${t}.${payload}`) so we
 * can trust "payment succeeded" events. Returns true when valid.
 */
export function verifyStripeSignature(payload: string, sigHeader: string | null): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !sigHeader) return false;
  const parts = Object.fromEntries(sigHeader.split(',').map((kv) => kv.split('=')));
  const t = parts['t'];
  const v1 = parts['v1'];
  if (!t || !v1) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  } catch {
    return false;
  }
}

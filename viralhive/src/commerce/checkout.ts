import Stripe from "stripe";
import type { CommerceConfig, Product } from "../config/types.js";
import { childLogger } from "../core/logger.js";

const log = childLogger("commerce");

/**
 * Creates a one-off Stripe Checkout Session link for a product so a single
 * generated video/post can carry a real, trackable "buy now" URL. Requires
 * commerce.stripeSecretKeyEnv in config and the product to have a
 * stripePriceId (create the Price once in Stripe; this module only creates
 * the per-post Checkout Session, not the underlying catalog).
 */
export async function createCheckoutLink(
  commerce: CommerceConfig,
  product: Product,
  opts: { campaignId: string; accountId: string; contentItemId: string }
): Promise<string> {
  if (!commerce.stripeSecretKeyEnv) {
    return fallbackCheckoutUrl(commerce, product, opts);
  }
  const secretKey = process.env[commerce.stripeSecretKeyEnv];
  if (!secretKey) {
    log.warn({ productId: product.id }, "stripeSecretKeyEnv set but empty; falling back to static checkout URL");
    return fallbackCheckoutUrl(commerce, product, opts);
  }
  if (!product.stripePriceId) {
    log.warn({ productId: product.id }, "product has no stripePriceId; falling back to static checkout URL");
    return fallbackCheckoutUrl(commerce, product, opts);
  }

  const stripe = new Stripe(secretKey);
  const successUrl = commerce.checkoutBaseUrl
    ? `${commerce.checkoutBaseUrl}/thank-you?product=${product.id}`
    : "https://example.com/thank-you";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: product.stripePriceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: commerce.checkoutBaseUrl ?? "https://example.com",
    metadata: {
      campaignId: opts.campaignId,
      accountId: opts.accountId,
      contentItemId: opts.contentItemId,
      productId: product.id,
    },
  });

  if (!session.url) throw new Error(`Stripe did not return a checkout URL for session ${session.id}`);
  return session.url;
}

function fallbackCheckoutUrl(
  commerce: CommerceConfig,
  product: Product,
  opts: { campaignId: string; accountId: string; contentItemId: string }
): string {
  const base = commerce.checkoutBaseUrl ?? "https://example.com/buy";
  const utm = new URLSearchParams({
    product: product.id,
    utm_source: opts.accountId,
    utm_medium: "social",
    utm_campaign: opts.campaignId,
    utm_content: opts.contentItemId,
  });
  return `${base}?${utm.toString()}`;
}

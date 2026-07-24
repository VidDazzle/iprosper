import type { ContentBrief, Product } from "../config/types.js";

/** Reference image to hand the video/image provider so the product actually appears on-screen. */
export function productReferenceImage(product: Product): string | undefined {
  return product.imageUrls[0];
}

/** Appends a checkout CTA line to the caption once the checkout link is known. */
export function withCheckoutCta(brief: ContentBrief, checkoutUrl: string): ContentBrief {
  return {
    ...brief,
    checkoutUrl,
    caption: `${brief.caption}\n\nShop this now: ${checkoutUrl}`,
  };
}

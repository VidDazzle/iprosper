// Drafts an outreach message for a prospect + matched product. Every draft is
// generated with its required disclosure and always enters the human review
// queue — this module never sends anything.

import type { Platform, ProductLike } from './types';
import { buildDisclosure, enforceDisclosure } from './compliance';

export interface DraftInput {
  platform: Platform;
  channel: 'public_reply' | 'dm';
  painPoint: string;
  product: ProductLike;
  isAffiliate: boolean;
  productUrl: string;
  attributionTag?: string;
  templateVariant?: string;
}

export interface Draft {
  body: string;
  disclosureText: string;
  templateVariant: string;
  attributionTag: string;
}

// A/B template variants. The feedback loop (outreachOutcomes) tells us which
// wins over time; new variants can be added freely.
const TEMPLATES: Record<string, (i: DraftInput, url: string) => string> = {
  helpful: (i, url) =>
    `Saw you were ${lower(i.painPoint)} — ${i.product.title} solved this for a lot of folks. Details here: ${url}. Happy to answer questions.`,
  concise: (i, url) =>
    `For ${lower(i.painPoint)}, ${i.product.title} is worth a look: ${url}`,
  social_proof: (i, url) =>
    `A lot of people dealing with ${lower(i.painPoint)} have had good results with ${i.product.title}${i.product.reviewScore ? ` (${i.product.reviewScore.toFixed(1)}/5)` : ''}. Here's where to check it out: ${url}`,
};

function lower(s: string): string {
  const t = s.trim().replace(/[.?!]+$/, '');
  return t.charAt(0).toLowerCase() + t.slice(1);
}

function withAttribution(rawUrl: string, tag: string): string {
  try {
    const url = new URL(rawUrl);
    url.searchParams.set('utm_source', 'iprosper');
    url.searchParams.set('utm_medium', 'social');
    url.searchParams.set('utm_campaign', tag);
    return url.toString();
  } catch {
    // Not a valid absolute URL — append a query string best-effort.
    const sep = rawUrl.includes('?') ? '&' : '?';
    return `${rawUrl}${sep}utm_source=iprosper&utm_medium=social&utm_campaign=${encodeURIComponent(tag)}`;
  }
}

/**
 * Produce a review-ready draft. The returned body already includes the
 * disclosure, so what the reviewer approves is exactly what would be sent.
 */
export function draftOutreach(input: DraftInput): Draft {
  const variant = input.templateVariant && TEMPLATES[input.templateVariant]
    ? input.templateVariant
    : pickVariant(input);
  const attributionTag = input.attributionTag ?? `p${input.product.id}-${input.platform}`;
  const url = withAttribution(input.productUrl, attributionTag);

  const rawBody = TEMPLATES[variant](input, url);
  const disclosureText = buildDisclosure({
    isAffiliate: input.isAffiliate,
    platform: input.platform,
    channel: input.channel,
  });
  const body = enforceDisclosure(rawBody, disclosureText);

  return { body, disclosureText, templateVariant: variant, attributionTag };
}

// Deterministic-ish variant pick so a given product spreads across variants
// (round-robin by product id) until the feedback loop overrides it.
function pickVariant(input: DraftInput): string {
  const keys = Object.keys(TEMPLATES);
  return keys[input.product.id % keys.length];
}

export const TEMPLATE_NAMES = Object.keys(TEMPLATES);

// Shared types for the social prospecting pipeline.

export type Platform =
  | 'x'
  | 'reddit'
  | 'youtube'
  | 'instagram'
  | 'tiktok'
  | 'linkedin'
  // Listen-only aggregate source: blogs, forums, and Q&A sites via public
  // RSS/Atom feeds and official APIs. Never used for automated outreach.
  | 'web';

export const PLATFORMS: Platform[] = [
  'x',
  'reddit',
  'youtube',
  'instagram',
  'tiktok',
  'linkedin',
  'web',
];

/** A normalized public item returned by any connector. */
export interface RawMention {
  platform: Platform;
  externalId: string;
  permalink?: string;
  authorHandle?: string;
  authorExternalId?: string;
  content: string;
  lang?: string;
  postedAt?: string; // ISO
}

/** Result of the LLM intent classifier. */
export interface IntentResult {
  buyingIntent: number; // 0..1
  urgency: number; // 0..1
  painPoint: string | null;
  sentiment: 'positive' | 'neutral' | 'negative' | 'crisis';
  crisisFlag: boolean;
  budgetSignal: string | null;
  rationale: string;
  model: string;
}

export interface ProductLike {
  id: number;
  title: string;
  description?: string | null;
  category?: string | null;
  priceUsd?: number | null;
  marginPct?: number | null;
  shipDaysMax?: number | null;
  reviewScore?: number | null;
  reviewCount?: number | null;
  affiliatePayoutUsd?: number | null;
  embedding?: string | null; // JSON array
  priorityScore?: number | null; // set by the performance optimizer (0..100)
}

export interface ScoredProduct {
  product: ProductLike;
  relevance: number; // 0..1 semantic relevance to the pain point
  score: number; // composite ranking score
}

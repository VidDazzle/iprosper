// Lead scoring and product matching.

import type { IntentResult, ProductLike, ScoredProduct } from './types';

/**
 * Roll a single intent signal into a 0..100 lead score. Crisis posts always
 * score 0 (they must never be marketed to). Score blends buying intent,
 * urgency, and a small budget bonus.
 */
export function scoreLead(intent: IntentResult): number {
  if (intent.crisisFlag) return 0;
  const base = intent.buyingIntent * 70;
  const urgencyBonus = intent.urgency * 20;
  const budgetBonus = intent.budgetSignal ? 10 : 0;
  const sentimentPenalty = intent.sentiment === 'negative' ? 10 : 0;
  return Math.max(0, Math.min(100, base + urgencyBonus + budgetBonus - sentimentPenalty));
}

/**
 * Combine multiple mention scores for the same prospect. Recent, high signals
 * dominate; we use a decayed max so one strong buying signal isn't diluted by
 * older chatter, but repeated interest still nudges the score up.
 */
export function rollUpProspectScore(scores: number[]): number {
  if (scores.length === 0) return 0;
  const max = Math.max(...scores);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.min(100, max * 0.8 + avg * 0.2);
}

/** Cosine similarity between two equal-length vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Lexical relevance fallback when embeddings are unavailable: Jaccard overlap
 * of significant tokens between the pain point and a product's text.
 */
export function lexicalRelevance(painPoint: string, product: ProductLike): number {
  const stop = new Set([
    'the', 'a', 'an', 'to', 'for', 'of', 'and', 'or', 'i', 'my', 'me', 'is',
    'are', 'in', 'on', 'with', 'need', 'looking', 'want', 'best', 'any',
  ]);
  const toks = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stop.has(w)),
    );
  const p = toks(painPoint);
  const q = toks(`${product.title} ${product.description ?? ''} ${product.category ?? ''}`);
  if (p.size === 0 || q.size === 0) return 0;
  let inter = 0;
  for (const t of p) if (q.has(t)) inter++;
  return inter / (p.size + q.size - inter);
}

export interface MatchOptions {
  painPoint: string;
  painPointEmbedding?: number[] | null;
  products: ProductLike[];
  limit?: number;
}

/**
 * Rank products for a pain point. Uses embedding cosine similarity when both
 * sides have vectors, otherwise a lexical fallback. Final score also rewards
 * margin/payout, fast shipping, and good reviews so we surface items that both
 * fit AND make money and won't generate refunds.
 */
export function matchProducts(opts: MatchOptions): ScoredProduct[] {
  const { painPoint, painPointEmbedding, products, limit = 5 } = opts;

  const scored: ScoredProduct[] = products.map((product) => {
    let relevance = 0;
    const emb = parseEmbedding(product.embedding);
    if (painPointEmbedding && emb) {
      relevance = Math.max(0, cosineSimilarity(painPointEmbedding, emb));
    } else {
      relevance = lexicalRelevance(painPoint, product);
    }

    const marginFactor = normalizeMargin(product);
    const shipFactor = normalizeShip(product.shipDaysMax);
    const reviewFactor = normalizeReviews(product.reviewScore, product.reviewCount);
    // Proven performers (set by the optimizer) get a modest promotion boost.
    const priorityFactor =
      typeof product.priorityScore === 'number'
        ? Math.max(0, Math.min(1, product.priorityScore / 100))
        : 0.4;

    // Relevance dominates; commercial + performance factors break ties.
    const score =
      relevance * 0.55 +
      priorityFactor * 0.15 +
      marginFactor * 0.15 +
      reviewFactor * 0.1 +
      shipFactor * 0.05;

    return { product, relevance, score };
  });

  return scored
    .filter((s) => s.relevance > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function parseEmbedding(raw?: string | null): number[] | null {
  if (!raw) return null;
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) && arr.every((n) => typeof n === 'number') ? arr : null;
  } catch {
    return null;
  }
}

function normalizeMargin(p: ProductLike): number {
  if (typeof p.marginPct === 'number') return Math.max(0, Math.min(1, p.marginPct / 100));
  if (typeof p.affiliatePayoutUsd === 'number')
    return Math.max(0, Math.min(1, p.affiliatePayoutUsd / 100));
  return 0.3; // neutral default
}

function normalizeShip(shipDaysMax?: number | null): number {
  if (typeof shipDaysMax !== 'number') return 0.5;
  if (shipDaysMax <= 3) return 1;
  if (shipDaysMax <= 7) return 0.8;
  if (shipDaysMax <= 14) return 0.5;
  if (shipDaysMax <= 30) return 0.2;
  return 0.05;
}

function normalizeReviews(score?: number | null, count?: number | null): number {
  if (typeof score !== 'number') return 0.5;
  const s = Math.max(0, Math.min(1, score / 5));
  const confidence = typeof count === 'number' ? Math.min(1, count / 200) : 0.3;
  return s * (0.5 + 0.5 * confidence);
}

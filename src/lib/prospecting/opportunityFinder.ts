// Evaluates affiliate programs and business/money-making opportunities: given a
// candidate (name, kind, optional URL/notes), it produces a rationale, a
// revenue estimate, an effort level, and a 0..100 attractiveness score.
//
// Uses the LLM when ANTHROPIC_API_KEY is set, otherwise a transparent
// heuristic. This module only *evaluates* — it never enrolls the operator in
// anything. Enrollment is a separate, human-authorized action.

export type OpportunityKind = 'affiliate' | 'business' | 'dropship_niche';

export interface OpportunityCandidate {
  kind: OpportunityKind;
  name: string;
  url?: string;
  network?: string;
  category?: string;
  notes?: string;
}

export interface OpportunityEvaluation {
  rationale: string;
  estRevenueLowUsd: number;
  estRevenueHighUsd: number;
  effortLevel: 'low' | 'medium' | 'high';
  score: number; // 0..100
  model: string;
}

const MODEL = 'claude-haiku-4-5-20251001';

const SYSTEM = `You are a careful analyst evaluating an online money-making opportunity for a solo operator running compliant affiliate/dropshipping promotion.
Given a candidate, return ONLY JSON:
{
  "rationale": "2-3 sentences on why this is or isn't attractive, with concrete factors (demand, competition, payout, margin, saturation, risk)",
  "estRevenueLowUsd": number (conservative monthly estimate),
  "estRevenueHighUsd": number (optimistic monthly estimate),
  "effortLevel": "low" | "medium" | "high",
  "score": number 0..100 (overall attractiveness)
}
Be realistic and skeptical. Do not hype. If it looks like an MLM, a pyramid scheme, or a get-rich-quick scam, say so plainly and score it low.`;

export async function evaluateOpportunity(
  candidate: OpportunityCandidate,
): Promise<OpportunityEvaluation> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return heuristicEvaluate(candidate);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        system: SYSTEM,
        messages: [{ role: 'user', content: JSON.stringify(candidate) }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) return heuristicEvaluate(candidate);
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = data.content?.find((b) => b.type === 'text')?.text ?? '';
    const parsed = extractJson(text);
    if (!parsed) return heuristicEvaluate(candidate);
    return normalize(parsed);
  } catch {
    return heuristicEvaluate(candidate);
  } finally {
    clearTimeout(timeout);
  }
}

// Transparent heuristic used when no LLM is configured.
export function heuristicEvaluate(candidate: OpportunityCandidate): OpportunityEvaluation {
  const text = `${candidate.name} ${candidate.notes ?? ''} ${candidate.category ?? ''}`.toLowerCase();
  const scamTerms = ['guaranteed', 'get rich', 'mlm', 'pyramid', 'no risk', 'passive millions', 'crypto doubler'];
  const isScammy = scamTerms.some((t) => text.includes(t));

  const kindBase: Record<OpportunityKind, number> = {
    affiliate: 55,
    dropship_niche: 50,
    business: 45,
  };
  let score = kindBase[candidate.kind];
  if (candidate.network) score += 8; // reputable network named
  if (candidate.url) score += 4;
  if (isScammy) score = Math.min(score, 12);

  const low = candidate.kind === 'affiliate' ? 100 : 200;
  const high = candidate.kind === 'affiliate' ? 1500 : 4000;

  return {
    rationale: isScammy
      ? 'Contains classic get-rich-quick / MLM red flags; treat with extreme caution and verify independently before any involvement.'
      : `A ${candidate.kind} opportunity${candidate.network ? ` on ${candidate.network}` : ''}. Heuristic estimate only — validate demand, payout terms, and competition before committing.`,
    estRevenueLowUsd: low,
    estRevenueHighUsd: high,
    effortLevel: candidate.kind === 'business' ? 'high' : 'medium',
    score: Math.max(0, Math.min(100, score)),
    model: 'heuristic-v1',
  };
}

function extractJson(text: string): Record<string, unknown> | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalize(raw: Record<string, unknown>): OpportunityEvaluation {
  const effort = ['low', 'medium', 'high'].includes(String(raw.effortLevel))
    ? (raw.effortLevel as 'low' | 'medium' | 'high')
    : 'medium';
  return {
    rationale: raw.rationale ? String(raw.rationale).slice(0, 800) : 'No rationale returned.',
    estRevenueLowUsd: num(raw.estRevenueLowUsd),
    estRevenueHighUsd: num(raw.estRevenueHighUsd),
    effortLevel: effort,
    score: Math.max(0, Math.min(100, num(raw.score))),
    model: MODEL,
  };
}

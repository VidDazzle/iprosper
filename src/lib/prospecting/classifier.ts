// Intent classifier. Scores a public mention for buying intent, urgency, pain
// point, sentiment, and budget signal.
//
// If ANTHROPIC_API_KEY is set, it uses an LLM for nuanced classification. If
// not, it falls back to a transparent heuristic so the pipeline still runs in
// dev / CI. Either way the output shape is identical.

import type { IntentResult } from './types';

const CRISIS_TERMS = [
  'suicid', 'self harm', 'self-harm', 'kill myself', 'want to die',
  'emergency', 'overdose', 'abuse', 'assault',
];

const BUYING_TERMS = [
  'recommend', 'recommendation', 'looking for', 'any suggestions', 'best ',
  'where can i buy', 'where to buy', 'need a', 'need to buy', 'want to buy',
  'anyone use', 'worth it', 'alternative to', 'vs ', 'help me find',
  'in the market for', 'shopping for',
];

const URGENCY_TERMS = ['asap', 'urgent', 'today', 'right now', 'immediately', 'by tomorrow', 'deadline'];

const BUDGET_TERMS = ['budget', 'under $', 'cheap', 'affordable', 'premium', 'willing to pay', 'spend up to'];

const NEGATIVE_TERMS = ['hate', 'terrible', 'worst', 'broken', 'scam', 'frustrated', 'angry', 'disappointed'];

/** Deterministic fallback classifier. Pure function of the text. */
export function heuristicClassify(content: string): IntentResult {
  const text = content.toLowerCase();

  const crisis = CRISIS_TERMS.some((t) => text.includes(t));
  const buyingHits = BUYING_TERMS.filter((t) => text.includes(t)).length;
  const urgencyHits = URGENCY_TERMS.filter((t) => text.includes(t)).length;
  const budgetHit = BUDGET_TERMS.find((t) => text.includes(t)) ?? null;
  const negativeHits = NEGATIVE_TERMS.filter((t) => text.includes(t)).length;

  const buyingIntent = crisis ? 0 : Math.min(1, buyingHits * 0.34 + (text.includes('?') ? 0.15 : 0));
  const urgency = Math.min(1, urgencyHits * 0.4);

  let sentiment: IntentResult['sentiment'] = 'neutral';
  if (crisis) sentiment = 'crisis';
  else if (negativeHits >= 2) sentiment = 'negative';
  else if (buyingHits > 0 && negativeHits === 0) sentiment = 'positive';

  return {
    buyingIntent,
    urgency,
    painPoint: buyingIntent > 0.3 ? extractPainPoint(content) : null,
    sentiment,
    crisisFlag: crisis,
    budgetSignal: budgetHit,
    rationale: `heuristic: ${buyingHits} buying-term hit(s), ${urgencyHits} urgency, ${negativeHits} negative${crisis ? ', CRISIS' : ''}`,
    model: 'heuristic-v1',
  };
}

function extractPainPoint(content: string): string {
  // Grab the sentence most likely to state the need.
  const sentences = content.split(/(?<=[.!?])\s+/);
  const best = sentences.find((s) =>
    BUYING_TERMS.some((t) => s.toLowerCase().includes(t)),
  );
  return (best ?? sentences[0] ?? content).slice(0, 240).trim();
}

const CLASSIFIER_MODEL = 'claude-haiku-4-5-20251001';

const SYSTEM_PROMPT = `You classify a single public social-media post for a compliant B2C prospecting pipeline.
Return ONLY a JSON object with these keys:
- buyingIntent: number 0..1 (probability the author is genuinely looking to buy/try a product or service)
- urgency: number 0..1
- painPoint: short string describing the need, or null
- sentiment: one of "positive" | "neutral" | "negative" | "crisis"
- crisisFlag: boolean (true if the post indicates a personal crisis, self-harm, medical emergency, grief, or acute distress — in which case we must NOT market to them)
- budgetSignal: short string or null
- rationale: one short sentence
Never invent buying intent where there is none. If the post is a personal crisis, set crisisFlag true and buyingIntent 0.`;

interface ClassifyOptions {
  timeoutMs?: number;
}

/**
 * Classify a mention. Uses the LLM when an API key is present; otherwise the
 * heuristic. Any LLM error falls back to the heuristic so the pipeline never
 * hard-fails on classification.
 */
export async function classifyIntent(
  content: string,
  opts: ClassifyOptions = {},
): Promise<IntentResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return heuristicClassify(content);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15000);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLASSIFIER_MODEL,
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `POST:\n${content.slice(0, 4000)}` }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) return heuristicClassify(content);

    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const textBlock = data.content?.find((b) => b.type === 'text')?.text ?? '';
    const parsed = extractJson(textBlock);
    if (!parsed) return heuristicClassify(content);

    return normalize(parsed);
  } catch {
    return heuristicClassify(content);
  } finally {
    clearTimeout(timeout);
  }
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

function clamp01(n: unknown): number {
  const x = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function normalize(raw: Record<string, unknown>): IntentResult {
  const sentiment = ['positive', 'neutral', 'negative', 'crisis'].includes(
    String(raw.sentiment),
  )
    ? (raw.sentiment as IntentResult['sentiment'])
    : 'neutral';
  const crisisFlag = Boolean(raw.crisisFlag) || sentiment === 'crisis';
  return {
    buyingIntent: crisisFlag ? 0 : clamp01(raw.buyingIntent),
    urgency: clamp01(raw.urgency),
    painPoint: raw.painPoint ? String(raw.painPoint).slice(0, 240) : null,
    sentiment,
    crisisFlag,
    budgetSignal: raw.budgetSignal ? String(raw.budgetSignal).slice(0, 120) : null,
    rationale: raw.rationale ? String(raw.rationale).slice(0, 240) : 'llm classification',
    model: CLASSIFIER_MODEL,
  };
}

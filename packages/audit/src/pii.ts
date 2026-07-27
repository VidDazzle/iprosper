// Heuristic PII scanner for outbound content (spec Section 3: "PII scan
// on outbound content"). This is pattern-matching, not a legal
// certification — real-world PII detection (especially for non-US
// formats) needs a proper review before this gates anything that
// actually goes live. Flagged here rather than presented as complete.

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const US_PHONE_RE = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/g;
const CREDIT_CARD_RE = /\b(?:\d[ -]*?){13,16}\b/g;

export interface PiiMatch {
  type: "email" | "phone" | "ssn" | "credit_card";
  value: string;
}

export interface PiiScanOptions {
  /** Values the caller has explicitly declared safe to publish (e.g. the business's own public contact info). */
  allowlist?: string[];
}

export function scanForPii(content: string, options: PiiScanOptions = {}): PiiMatch[] {
  const allowlist = new Set((options.allowlist ?? []).map((v) => normalize(v)));
  const matches: PiiMatch[] = [];

  for (const [type, re] of [
    ["email", EMAIL_RE],
    ["phone", US_PHONE_RE],
    ["ssn", SSN_RE],
    ["credit_card", CREDIT_CARD_RE],
  ] as const) {
    for (const match of content.matchAll(re)) {
      const value = match[0];
      if (allowlist.has(normalize(value))) continue;
      // SSN pattern can false-positive on credit-card-shaped numbers already caught; dedupe by value+type below.
      matches.push({ type, value });
    }
  }

  // de-duplicate identical (type, value) pairs
  const seen = new Set<string>();
  return matches.filter((m) => {
    const key = `${m.type}:${m.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalize(value: string): string {
  return value.replace(/[^a-zA-Z0-9@.]/g, "").toLowerCase();
}

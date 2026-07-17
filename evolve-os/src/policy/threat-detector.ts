/**
 * Heuristic threat / bot detector.
 *
 * This is a transparent, explainable scoring layer — NOT a replacement for a
 * WAF, mTLS, or a managed bot-mitigation service, but a fast in-process filter
 * that catches the common signatures of automated abuse and prompt-injection
 * probing before a request reaches an agent. Each signal contributes to a
 * 0..100 risk score; callers decide the threshold.
 */
export interface RequestSignal {
  ip?: string;
  userAgent?: string;
  path?: string;
  /** Request body / prompt text, if inspectable. */
  body?: string;
  /** Requests observed from this key in the current window. */
  recentCount?: number;
  /** Whether the caller presented a valid verifiable token. */
  authenticated?: boolean;
}

export interface ThreatVerdict {
  score: number; // 0..100
  action: "allow" | "challenge" | "block";
  reasons: string[];
}

const BOT_UA = /(bot|crawler|spider|curl|wget|python-requests|scrapy|headless)/i;

// Common prompt-injection / jailbreak probes against agents.
const INJECTION_PATTERNS: RegExp[] = [
  /ignore (all |your )?(previous|prior|above) instructions/i,
  /disregard (the )?(system|previous) prompt/i,
  /you are now (in )?(dev|developer|god) mode/i,
  /reveal (your )?(system prompt|instructions|api key|secret)/i,
  /print (your )?(system prompt|env|environment variables)/i,
  /\bexfiltrate\b/i,
];

// Obvious injection / traversal markers in structured input.
const MALICIOUS_INPUT: RegExp[] = [
  /(\bunion\b\s+\bselect\b)|(\bdrop\s+table\b)/i, // SQLi
  /<script\b|onerror\s*=|javascript:/i, // XSS
  /\.\.\/\.\.\//, // path traversal
  /\$\{jndi:/i, // log4shell-style
];

export interface ThreatConfig {
  challengeAt: number; // score threshold to challenge
  blockAt: number; // score threshold to block
  requestsPerWindowSoftCap: number;
}

export const DEFAULT_THREAT_CONFIG: ThreatConfig = {
  challengeAt: 40,
  blockAt: 70,
  requestsPerWindowSoftCap: 120,
};

export function assessThreat(
  sig: RequestSignal,
  cfg: ThreatConfig = DEFAULT_THREAT_CONFIG,
): ThreatVerdict {
  let score = 0;
  const reasons: string[] = [];

  if (!sig.userAgent) {
    score += 15;
    reasons.push("missing user-agent");
  } else if (BOT_UA.test(sig.userAgent)) {
    score += 25;
    reasons.push("automated user-agent signature");
  }

  if (sig.authenticated === false) {
    score += 10;
    reasons.push("unauthenticated");
  }

  if (sig.recentCount && sig.recentCount > cfg.requestsPerWindowSoftCap) {
    const over = sig.recentCount - cfg.requestsPerWindowSoftCap;
    const add = Math.min(40, Math.ceil(over / 10) * 5);
    score += add;
    reasons.push(`high request volume (${sig.recentCount})`);
  }

  const body = sig.body ?? "";
  for (const re of INJECTION_PATTERNS) {
    if (re.test(body)) {
      score += 40;
      reasons.push("prompt-injection pattern");
      break;
    }
  }
  for (const re of MALICIOUS_INPUT) {
    if (re.test(body) || (sig.path && re.test(sig.path))) {
      score += 70;
      reasons.push("malicious payload signature");
      break;
    }
  }

  score = Math.min(100, score);
  const action: ThreatVerdict["action"] =
    score >= cfg.blockAt ? "block" : score >= cfg.challengeAt ? "challenge" : "allow";
  return { score, action, reasons };
}

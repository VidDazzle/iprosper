import type { LLMProvider } from "../creative/types.js";
import type { ContentBrief, CampaignConfig } from "../config/types.js";

export interface PolicyCheckResult {
  compliant: boolean;
  reasons: string[];
}

const HARD_BLOCK_PATTERNS: RegExp[] = [
  /\b(kill|suicide|self[-\s]?harm)\b/i,
  /\bchild\s*(sexual|porn|abuse)/i,
  /\bhow to (make|build)\s+(a\s+)?(bomb|explosive|weapon)/i,
  /\b(buy|sell)\s+(drugs|firearms)\b/i,
];

/**
 * Automated compliance check — not a human approval step. This exists so the
 * autonomous loop never posts content that would get accounts banned or
 * cause real harm; it runs unattended just like everything else here.
 */
export async function checkPolicyCompliance(
  brief: ContentBrief,
  campaign: CampaignConfig,
  llm: LLMProvider
): Promise<PolicyCheckResult> {
  const text = `${brief.hook}\n${brief.script}\n${brief.caption}`;
  const reasons: string[] = [];

  for (const pattern of HARD_BLOCK_PATTERNS) {
    if (pattern.test(text)) reasons.push(`Matched hard-block pattern: ${pattern}`);
  }
  for (const banned of campaign.bannedTopics) {
    if (banned && text.toLowerCase().includes(banned.toLowerCase())) {
      reasons.push(`Mentions banned topic: "${banned}"`);
    }
  }
  if (reasons.length) return { compliant: false, reasons };

  const raw = await llm.chat(
    [
      {
        role: "system",
        content:
          "You are a strict platform content-policy reviewer for TikTok/Instagram/YouTube/X. " +
          "Respond with strict JSON only: {\"compliant\": boolean, \"reasons\": string[]}. " +
          "Flag non-compliant ONLY for: hate speech, harassment, sexual content involving minors, " +
          "graphic violence, self-harm promotion, dangerous misinformation (medical/financial/electoral), " +
          "unverifiable factual claims stated as fact, or clear platform ToS violations. " +
          "Do not flag mundane marketing, opinions, or edgy-but-safe humor.",
      },
      {
        role: "user",
        content: `Hook: ${brief.hook}\n\nScript: ${brief.script}\n\nCaption: ${brief.caption}`,
      },
    ],
    { json: true, maxTokens: 400 }
  );

  try {
    const parsed = JSON.parse(raw);
    if (!parsed.compliant) reasons.push(...(parsed.reasons ?? ["flagged by policy reviewer"]));
    return { compliant: !!parsed.compliant, reasons };
  } catch {
    // Fail closed: if the reviewer's response can't be parsed, don't auto-post.
    return { compliant: false, reasons: ["policy reviewer response was unparseable"] };
  }
}

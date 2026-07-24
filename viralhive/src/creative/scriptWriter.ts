import type { LLMProvider } from "./types.js";
import type { CampaignConfig, ContentBrief, Product } from "../config/types.js";
import type { TrendIdea } from "./trendEngine.js";
import { childLogger } from "../core/logger.js";

const log = childLogger("scriptwriter");

export interface WriteBriefOptions {
  /** Topics/angles that historically drove strong engagement — see analytics/learningEngine.ts.
   *  Biases ideation toward what has actually worked without hard-coding a single formula. */
  topPerformers?: string[];
  /** When set, the brief embeds the product (visual reference cue + CTA) — see commerce/productPlacement.ts. */
  product?: Product;
}

export async function writeContentBrief(
  llm: LLMProvider,
  campaign: CampaignConfig,
  idea: TrendIdea,
  opts: WriteBriefOptions = {}
): Promise<ContentBrief> {
  const raw = await llm.chat(
    [
      {
        role: "system",
        content:
          "You are an elite short-form video copywriter and SEO strategist who writes scroll-stopping " +
          "hooks, tight high-retention scripts, and keyword-rich metadata for TikTok/Reels/Shorts/YouTube. " +
          "You never use copyrighted lyrics, never make unverifiable factual claims, and never write " +
          "anything defamatory, hateful, sexually explicit, or otherwise unsafe. Output strict JSON only.",
      },
      {
        role: "user",
        content: [
          `Campaign goal: ${campaign.goal}`,
          `Niche: ${campaign.niche}`,
          `Tone keywords: ${campaign.toneKeywords.join(", ") || "energetic, authentic"}`,
          `Banned topics (never mention): ${campaign.bannedTopics.join(", ") || "none"}`,
          `Target length: ${campaign.videoLengthSeconds} seconds`,
          `Idea topic: ${idea.topic}`,
          `Idea angle: ${idea.angle}`,
          opts.topPerformers?.length
            ? `Angles that historically performed best for this account (lean into similar territory, don't repeat verbatim): ${opts.topPerformers.join(" | ")}`
            : "",
          opts.product
            ? `Feature this product naturally, don't hard-sell: "${opts.product.name}" — ${opts.product.description}. Include a clear but non-pushy call-to-action to check it out (a checkout link will be appended automatically).`
            : "",
          "",
          "Write a video brief as JSON with keys:",
          '"hook" (first 1-2 seconds of spoken/on-screen text, must earn the next 3 seconds of attention),',
          '"script" (full spoken narration or beat-by-beat visual/voiceover script, timed to the target length),',
          '"caption" (platform caption, <=2200 chars, includes a call-to-action),',
          '"hashtags" (array of 5-8 relevant hashtags, no spaces, no # symbol duplication),',
          '"seoTitle" (<=70 char keyword-rich title for platforms that show one, e.g. YouTube/Pinterest),',
          '"seoDescription" (<=160 char meta-style description packed with the primary keyword),',
          '"seoKeywords" (array of 6-10 target search keywords/phrases for this niche and topic),',
          '"altText" (<=125 char accessible/SEO alt text describing the video\'s opening frame).',
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
    { json: true, maxTokens: 1400 }
  );

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    log.error({ raw }, "script writer returned invalid JSON");
    throw new Error("Content brief generation failed: model did not return valid JSON");
  }

  return {
    campaignId: campaign.id,
    topic: idea.topic,
    hook: parsed.hook,
    script: parsed.script,
    caption: parsed.caption,
    hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.map(normalizeHashtag) : [],
    musicSuggestion: idea.musicSuggestion,
    seoTitle: parsed.seoTitle,
    seoDescription: parsed.seoDescription,
    seoKeywords: Array.isArray(parsed.seoKeywords) ? parsed.seoKeywords : [],
    altText: parsed.altText,
    productId: opts.product?.id,
  };
}

function normalizeHashtag(tag: string): string {
  const clean = tag.replace(/^#+/, "").replace(/\s+/g, "");
  return `#${clean}`;
}

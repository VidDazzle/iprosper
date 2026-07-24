import type { LLMProvider } from "./types.js";
import type { CampaignConfig, ContentBrief } from "../config/types.js";
import type { TrendIdea } from "./trendEngine.js";
import { childLogger } from "../core/logger.js";

const log = childLogger("scriptwriter");

export async function writeContentBrief(
  llm: LLMProvider,
  campaign: CampaignConfig,
  idea: TrendIdea
): Promise<ContentBrief> {
  const raw = await llm.chat(
    [
      {
        role: "system",
        content:
          "You are an elite short-form video copywriter who writes scroll-stopping hooks and " +
          "tight, high-retention scripts for TikTok/Reels/Shorts. You never use copyrighted " +
          "lyrics, never make unverifiable factual claims, and never write anything defamatory, " +
          "hateful, sexually explicit, or otherwise unsafe. Output strict JSON only.",
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
          "",
          "Write a video brief as JSON with keys:",
          '"hook" (first 1-2 seconds of spoken/on-screen text, must earn the next 3 seconds of attention),',
          '"script" (full spoken narration or beat-by-beat visual/voiceover script, timed to the target length),',
          '"caption" (platform caption, <=2200 chars, includes a call-to-action),',
          '"hashtags" (array of 5-8 relevant hashtags, no spaces, no # symbol duplication).',
        ].join("\n"),
      },
    ],
    { json: true, maxTokens: 1200 }
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
  };
}

function normalizeHashtag(tag: string): string {
  const clean = tag.replace(/^#+/, "").replace(/\s+/g, "");
  return `#${clean}`;
}

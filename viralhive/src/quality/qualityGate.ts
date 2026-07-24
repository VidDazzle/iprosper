import type { LLMProvider, ViralityProvider } from "../creative/types.js";
import type { CampaignConfig, ContentItem, QualityScore } from "../config/types.js";
import type { VideoPipeline, PipelineOptions } from "../creative/videoPipeline.js";
import { checkPolicyCompliance } from "./policyFilter.js";
import { childLogger } from "../core/logger.js";

const log = childLogger("quality-gate");

interface CreativeScores {
  hookStrength: number;
  pacing: number;
  visualQuality: number;
  audioQuality: number;
  trendAlignment: number;
  captionQuality: number;
  notes: string[];
}

async function scoreCreative(llm: LLMProvider, item: ContentItem): Promise<CreativeScores> {
  const raw = await llm.chat(
    [
      {
        role: "system",
        content:
          "You are a ruthless short-form video quality critic hired to enforce a 10/10-only " +
          "publishing bar. Score harshly — a 10 means genuinely best-in-class, hook-in-under-a-second, " +
          "zero dead air, professional-grade. Respond with strict JSON only: " +
          '{"hookStrength":0-10,"pacing":0-10,"visualQuality":0-10,"audioQuality":0-10,' +
          '"trendAlignment":0-10,"captionQuality":0-10,"notes":string[]}',
      },
      {
        role: "user",
        content: [
          `Topic: ${item.brief.topic}`,
          `Hook: ${item.brief.hook}`,
          `Script: ${item.brief.script}`,
          `Caption: ${item.brief.caption}`,
          `Hashtags: ${item.brief.hashtags.join(" ")}`,
          `Rendered video asset: ${item.videoAssetUrl ?? "(not yet rendered)"}`,
        ].join("\n"),
      },
    ],
    { json: true, maxTokens: 500 }
  );

  try {
    const parsed = JSON.parse(raw);
    return {
      hookStrength: clamp(parsed.hookStrength),
      pacing: clamp(parsed.pacing),
      visualQuality: clamp(parsed.visualQuality),
      audioQuality: clamp(parsed.audioQuality),
      trendAlignment: clamp(parsed.trendAlignment),
      captionQuality: clamp(parsed.captionQuality),
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
    };
  } catch (err) {
    log.error({ raw }, "creative scorer returned invalid JSON, scoring as 0");
    return {
      hookStrength: 0,
      pacing: 0,
      visualQuality: 0,
      audioQuality: 0,
      trendAlignment: 0,
      captionQuality: 0,
      notes: ["scorer returned invalid JSON; treated as fail"],
    };
  }
}

function clamp(n: unknown): number {
  const v = typeof n === "number" ? n : 0;
  return Math.max(0, Math.min(10, v));
}

export async function scoreContentItem(
  item: ContentItem,
  campaign: CampaignConfig,
  llm: LLMProvider,
  virality?: ViralityProvider
): Promise<QualityScore> {
  const [creative, policy] = await Promise.all([
    scoreCreative(llm, item),
    checkPolicyCompliance(item.brief, campaign, llm),
  ]);

  let viralityPrediction: number | undefined;
  if (virality) {
    try {
      const result = await virality.predict({
        videoUrl: item.videoAssetUrl,
        caption: item.brief.caption,
        hook: item.brief.hook,
      });
      viralityPrediction = result.score;
    } catch (err) {
      log.warn({ err }, "virality prediction failed; scoring without it");
    }
  }

  const creativeAvg =
    (creative.hookStrength +
      creative.pacing +
      creative.visualQuality +
      creative.audioQuality +
      creative.trendAlignment +
      creative.captionQuality) /
    6;

  const overall = viralityPrediction !== undefined ? creativeAvg * 0.7 + viralityPrediction * 0.3 : creativeAvg;

  return {
    overall: policy.compliant ? Number(overall.toFixed(2)) : 0,
    ...creative,
    policyCompliant: policy.compliant,
    viralityPrediction,
    notes: [...creative.notes, ...(policy.compliant ? [] : policy.reasons)],
  };
}

export interface QualityGateResult {
  item: ContentItem;
  passed: boolean;
}

/**
 * Runs the generate -> score -> (regenerate if needed) loop until the item
 * clears campaign.qualityThreshold or maxRegenerationAttempts is exhausted.
 * Nothing below the threshold is ever handed back as "ready".
 */
export async function runQualityGate(
  pipeline: VideoPipeline,
  campaign: CampaignConfig,
  llm: LLMProvider,
  virality: ViralityProvider | undefined,
  opts: PipelineOptions = {}
): Promise<QualityGateResult> {
  let item = await pipeline.createDraft(campaign, opts);

  for (let attempt = 1; attempt <= campaign.maxRegenerationAttempts; attempt++) {
    item = await pipeline.renderAssets(item, campaign, opts);
    const score = await scoreContentItem(item, campaign, llm, virality);
    item = { ...item, qualityScore: score };

    log.info(
      { campaignId: campaign.id, attempt, overall: score.overall, threshold: campaign.qualityThreshold },
      "scored content item"
    );

    if (score.policyCompliant && score.overall >= campaign.qualityThreshold) {
      return { item: { ...item, status: "ready" }, passed: true };
    }

    if (!score.policyCompliant) {
      log.warn({ campaignId: campaign.id, reasons: score.notes }, "content failed policy check");
      // Policy failures get a fresh idea next attempt rather than re-rendering the same script.
      item = await pipeline.createDraft(campaign, opts);
    }
  }

  return { item: { ...item, status: "rejected" }, passed: false };
}

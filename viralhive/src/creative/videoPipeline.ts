import { randomUUID } from "node:crypto";
import type { CampaignConfig, ContentItem, Product } from "../config/types.js";
import type { LLMProvider, VideoProvider, VoiceProvider } from "./types.js";
import type { TrendSource } from "./trendEngine.js";
import { writeContentBrief } from "./scriptWriter.js";
import { ensureSeoDefaults } from "../seo/seo.js";
import { productReferenceImage } from "../commerce/productPlacement.js";
import { childLogger } from "../core/logger.js";

const log = childLogger("video-pipeline");

export interface VideoPipelineDeps {
  llm: LLMProvider;
  video: VideoProvider;
  voice?: VoiceProvider;
  trends: TrendSource;
}

export interface PipelineOptions {
  /** Historically high-engagement topics/hooks — biases ideation. See analytics/learningEngine.ts. */
  topPerformers?: string[];
  /** Embeds this product's reference image in the render and a CTA in the caption. */
  product?: Product;
}

/**
 * Full idea -> script -> asset generation pipeline. Produces a ContentItem
 * ready for the quality gate. Does not post anywhere and does not touch the
 * network beyond the configured creative providers.
 */
export class VideoPipeline {
  constructor(private deps: VideoPipelineDeps) {}

  async createDraft(campaign: CampaignConfig, opts: PipelineOptions = {}): Promise<ContentItem> {
    const [idea] = await this.deps.trends.getIdeas(campaign.niche, 1);
    log.info({ campaignId: campaign.id, idea }, "selected content idea");

    const rawBrief = await writeContentBrief(this.deps.llm, campaign, idea, {
      topPerformers: opts.topPerformers,
      product: opts.product,
    });
    const brief = ensureSeoDefaults(rawBrief);

    const item: ContentItem = {
      id: randomUUID(),
      campaignId: campaign.id,
      brief,
      status: "generating",
      attempts: 0,
      createdAt: new Date().toISOString(),
    };
    return item;
  }

  async renderAssets(item: ContentItem, campaign: CampaignConfig, opts: PipelineOptions = {}): Promise<ContentItem> {
    const videoPrompt = buildVideoPrompt(item, opts.product);
    const video = await this.deps.video.generateVideo({
      prompt: videoPrompt,
      durationSeconds: campaign.videoLengthSeconds,
      aspectRatio: "9:16",
      referenceImageUrl: opts.product ? productReferenceImage(opts.product) : undefined,
    });

    let voiceAssetUrl: string | undefined;
    if (this.deps.voice) {
      try {
        const voice = await this.deps.voice.synthesize(item.brief.script);
        voiceAssetUrl = voice.assetUrl;
      } catch (err) {
        log.warn({ err }, "voiceover synthesis failed, continuing with video-native audio");
      }
    }

    return {
      ...item,
      videoAssetUrl: video.assetUrl,
      thumbnailUrl: undefined,
      status: "scoring",
      attempts: item.attempts + 1,
      // voiceAssetUrl currently informational; wire into a mux/render step if
      // your video provider doesn't already bake in narration.
      brief: voiceAssetUrl ? { ...item.brief } : item.brief,
    };
  }
}

function buildVideoPrompt(item: ContentItem, product?: Product): string {
  return [
    `Vertical 9:16 short-form video.`,
    `Hook (first frame/beat must sell this): ${item.brief.hook}`,
    `Script/storyboard: ${item.brief.script}`,
    `Mood/music: ${item.brief.musicSuggestion ?? "upbeat, trend-appropriate"}`,
    `Style: high production value, punchy cuts, on-screen text for the hook, no watermarks, no copyrighted footage.`,
    product
      ? `Feature this product naturally on-screen (use the provided reference image for its look): "${product.name}" — ${product.description}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

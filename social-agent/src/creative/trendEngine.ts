import type { LLMProvider } from "./types.js";
import { childLogger } from "../core/logger.js";

const log = childLogger("trends");

export interface TrendIdea {
  topic: string;
  angle: string;
  musicSuggestion?: string;
}

/**
 * Pluggable trend source. Ships with an LLM-brainstorm fallback so the
 * pipeline never stalls; swap in a real trends feed (TikTok Creative Center,
 * Google Trends, Exploding Topics, an internal analytics API) by implementing
 * this interface and passing it into VideoPipeline.
 */
export interface TrendSource {
  getIdeas(niche: string, count: number): Promise<TrendIdea[]>;
}

export class LLMTrendSource implements TrendSource {
  constructor(private llm: LLMProvider) {}

  async getIdeas(niche: string, count: number): Promise<TrendIdea[]> {
    const today = new Date().toISOString().slice(0, 10);
    const raw = await this.llm.chat(
      [
        {
          role: "system",
          content:
            "You are a short-form video trend strategist. Return strict JSON only, no prose.",
        },
        {
          role: "user",
          content: `Today is ${today}. Niche: "${niche}". Propose ${count} short-form video ideas ` +
            `optimized for virality on TikTok/Reels/Shorts. For each, give a punchy "topic", a ` +
            `differentiated "angle" (why this take stands out from generic content in the niche), ` +
            `and an optional "musicSuggestion" (a mood/genre, not a copyrighted track name). ` +
            `Respond as JSON: {"ideas":[{"topic":"","angle":"","musicSuggestion":""}]}`,
        },
      ],
      { json: true, maxTokens: 800 }
    );

    try {
      const parsed = JSON.parse(raw);
      return (parsed.ideas ?? []).slice(0, count);
    } catch (err) {
      log.warn({ raw }, "failed to parse trend ideas, falling back to single generic idea");
      return [{ topic: `${niche} tip of the day`, angle: "evergreen value" }];
    }
  }
}

/** Wraps a Higgsfield client's TikTok trending-audio lookup as a trend signal. */
export class HiggsfieldTrendSource implements TrendSource {
  constructor(
    private llm: LLMProvider,
    private fetchTrendingAudio: () => Promise<{ title: string; genre?: string }[]>
  ) {}

  async getIdeas(niche: string, count: number): Promise<TrendIdea[]> {
    let audio: { title: string; genre?: string }[] = [];
    try {
      audio = await this.fetchTrendingAudio();
    } catch (err) {
      log.warn({ err }, "trending audio lookup failed, continuing without it");
    }
    const base = await new LLMTrendSource(this.llm).getIdeas(niche, count);
    return base.map((idea, i) => ({
      ...idea,
      musicSuggestion: audio[i]?.title ?? idea.musicSuggestion,
    }));
  }
}

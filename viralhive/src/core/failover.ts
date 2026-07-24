import type { LLMProvider, VideoProvider, VideoGenerationRequest, VideoGenerationResult, ChatMessage } from "../creative/types.js";
import { childLogger } from "./logger.js";

const log = childLogger("failover");

/**
 * Self-healing for creative providers: if the primary LLM/video backend is
 * down, rate-limited, or returns garbage, automatically fall through to the
 * next configured provider instead of failing the whole campaign run. Order
 * comes from providers.* in accounts.yaml (a single id behaves exactly like
 * today; an array becomes a priority-ordered fallback chain).
 */
export class FailoverLLM implements LLMProvider {
  readonly id: string;
  constructor(private candidates: LLMProvider[]) {
    if (!candidates.length) throw new Error("FailoverLLM requires at least one candidate provider");
    this.id = `failover(${candidates.map((c) => c.id).join(" -> ")})`;
  }

  async chat(messages: ChatMessage[], opts?: { json?: boolean; maxTokens?: number }): Promise<string> {
    let lastError: unknown;
    for (const candidate of this.candidates) {
      try {
        return await candidate.chat(messages, opts);
      } catch (err) {
        lastError = err;
        log.warn({ provider: candidate.id, err: err instanceof Error ? err.message : err }, "LLM provider failed, trying next in chain");
      }
    }
    throw new Error(`All LLM providers in failover chain failed: ${lastError}`);
  }
}

export class FailoverVideoProvider implements VideoProvider {
  readonly id: string;
  constructor(private candidates: VideoProvider[]) {
    if (!candidates.length) throw new Error("FailoverVideoProvider requires at least one candidate provider");
    this.id = `failover(${candidates.map((c) => c.id).join(" -> ")})`;
  }

  async generateVideo(req: VideoGenerationRequest): Promise<VideoGenerationResult> {
    let lastError: unknown;
    for (const candidate of this.candidates) {
      try {
        return await candidate.generateVideo(req);
      } catch (err) {
        lastError = err;
        log.warn({ provider: candidate.id, err: err instanceof Error ? err.message : err }, "video provider failed, trying next in chain");
      }
    }
    throw new Error(`All video providers in failover chain failed: ${lastError}`);
  }
}

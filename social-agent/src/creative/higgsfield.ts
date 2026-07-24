import type { ProviderConfig } from "../config/types.js";
import { resolveProviderApiKey } from "../config/config.js";
import type { VideoGenerationRequest, VideoGenerationResult, VideoProvider, ImageProvider, ViralityProvider } from "./types.js";

/**
 * REST client for Higgsfield's public API (https://docs.higgsfield.ai).
 * Used when this agent runs standalone (phone/VPS/desktop) without access to
 * the Higgsfield MCP tools that are only available inside a Claude session —
 * the deployed daemon needs its own direct API integration.
 */
export class HiggsfieldClient implements VideoProvider, ImageProvider, ViralityProvider {
  readonly id: string;
  private apiKey: string;
  private baseUrl: string;

  constructor(cfg: ProviderConfig) {
    this.id = cfg.id;
    this.apiKey = resolveProviderApiKey(cfg.apiKeyEnv);
    this.baseUrl = cfg.baseUrl?.replace(/\/$/, "") || "https://api.higgsfield.ai/v1";
  }

  private async post(pathname: string, body: unknown) {
    const res = await fetch(`${this.baseUrl}${pathname}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`[higgsfield] ${pathname} failed: ${res.status} ${await res.text()}`);
    }
    return res.json() as Promise<any>;
  }

  private async pollJob(jobId: string, { intervalMs = 4000, timeoutMs = 10 * 60_000 } = {}) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const res = await fetch(`${this.baseUrl}/jobs/${jobId}`, {
        headers: { authorization: `Bearer ${this.apiKey}` },
      });
      const data = (await res.json()) as any;
      if (data.status === "completed") return data;
      if (data.status === "failed") throw new Error(`[higgsfield] job ${jobId} failed: ${data.error}`);
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error(`[higgsfield] job ${jobId} timed out`);
  }

  async generateVideo(req: VideoGenerationRequest): Promise<VideoGenerationResult> {
    const created = await this.post("/videos/generate", {
      prompt: req.prompt,
      duration_seconds: req.durationSeconds,
      aspect_ratio: req.aspectRatio,
      reference_image_url: req.referenceImageUrl,
    });
    const jobId = created.job_id as string;
    const result = await this.pollJob(jobId);
    return { assetUrl: result.output.video_url, jobId, provider: this.id };
  }

  async generateImage(prompt: string, opts?: { aspectRatio?: string }) {
    const created = await this.post("/images/generate", {
      prompt,
      aspect_ratio: opts?.aspectRatio ?? "9:16",
    });
    const jobId = created.job_id as string;
    const result = await this.pollJob(jobId);
    return { assetUrl: result.output.image_url };
  }

  async predict(input: { videoUrl?: string; caption: string; hook: string }) {
    const data = await this.post("/virality/predict", {
      video_url: input.videoUrl,
      caption: input.caption,
      hook: input.hook,
    });
    return { score: data.score as number, reasoning: data.reasoning as string | undefined };
  }

  async publishToTikTok(videoUrl: string, caption: string, accountToken: string) {
    return this.post("/tiktok/publish", { video_url: videoUrl, caption, account_token: accountToken });
  }
}

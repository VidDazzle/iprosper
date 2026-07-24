import type { ProviderConfig } from "../config/types.js";
import { resolveProviderApiKey } from "../config/config.js";
import type { ImageProvider } from "./types.js";

/** REST client for Leonardo.ai image generation (https://docs.leonardo.ai). */
export class LeonardoClient implements ImageProvider {
  readonly id: string;
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(cfg: ProviderConfig) {
    this.id = cfg.id;
    this.apiKey = resolveProviderApiKey(cfg.apiKeyEnv);
    this.baseUrl = cfg.baseUrl?.replace(/\/$/, "") || "https://cloud.leonardo.ai/api/rest/v1";
    this.model = cfg.model || "6b645e3a-d64f-4341-a6d8-7a3690fbf042"; // Leonardo Phoenix default
  }

  async generateImage(prompt: string, opts?: { aspectRatio?: string }) {
    const [width, height] = aspectToSize(opts?.aspectRatio);
    const created = await fetch(`${this.baseUrl}/generations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        prompt,
        modelId: this.model,
        width,
        height,
        num_images: 1,
      }),
    });
    if (!created.ok) {
      throw new Error(`[leonardo] generation request failed: ${created.status} ${await created.text()}`);
    }
    const createdBody = (await created.json()) as any;
    const genId = createdBody.sdGenerationJob.generationId as string;

    const start = Date.now();
    while (Date.now() - start < 5 * 60_000) {
      const res = await fetch(`${this.baseUrl}/generations/${genId}`, {
        headers: { authorization: `Bearer ${this.apiKey}` },
      });
      const data = (await res.json()) as any;
      const images = data.generations_by_pk?.generated_images;
      if (images?.length) return { assetUrl: images[0].url as string };
      await new Promise((r) => setTimeout(r, 3000));
    }
    throw new Error(`[leonardo] generation ${genId} timed out`);
  }
}

function aspectToSize(aspectRatio?: string): [number, number] {
  switch (aspectRatio) {
    case "16:9":
      return [1024, 576];
    case "1:1":
      return [1024, 1024];
    case "9:16":
    default:
      return [576, 1024];
  }
}

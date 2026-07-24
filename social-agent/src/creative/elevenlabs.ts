import type { ProviderConfig } from "../config/types.js";
import { resolveProviderApiKey } from "../config/config.js";
import type { VoiceProvider } from "./types.js";

/** Optional voiceover narration via ElevenLabs text-to-speech. */
export class ElevenLabsClient implements VoiceProvider {
  readonly id: string;
  private apiKey: string;
  private baseUrl: string;

  constructor(cfg: ProviderConfig) {
    this.id = cfg.id;
    this.apiKey = resolveProviderApiKey(cfg.apiKeyEnv);
    this.baseUrl = cfg.baseUrl?.replace(/\/$/, "") || "https://api.elevenlabs.io/v1";
  }

  async synthesize(text: string, opts?: { voiceId?: string }) {
    const voiceId = opts?.voiceId || "21m00Tcm4TlvDq8ikWAM";
    const res = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "xi-api-key": this.apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
      }),
    });
    if (!res.ok) {
      throw new Error(`[elevenlabs] synth failed: ${res.status} ${await res.text()}`);
    }
    // The API streams raw audio bytes back; caller is responsible for
    // uploading/persisting it wherever the video pipeline expects assets.
    const arrayBuffer = await res.arrayBuffer();
    const dataUrl = `data:audio/mpeg;base64,${Buffer.from(arrayBuffer).toString("base64")}`;
    return { assetUrl: dataUrl };
  }
}

import type { AppConfig, ProviderConfig } from "../config/types.js";
import type { ImageProvider, LLMProvider, VideoProvider, ViralityProvider, VoiceProvider } from "./types.js";
import { buildLLMProvider } from "./genericLLM.js";
import { HiggsfieldClient } from "./higgsfield.js";
import { LeonardoClient } from "./leonardo.js";
import { ElevenLabsClient } from "./elevenlabs.js";

function findProvider(config: AppConfig, id: string): ProviderConfig {
  const found = config.providerRegistry.find((p) => p.id === id);
  if (!found) throw new Error(`Provider "${id}" is not defined in providerRegistry`);
  return found;
}

export interface CampaignProviders {
  llm: LLMProvider;
  video: VideoProvider;
  image?: ImageProvider;
  voice?: VoiceProvider;
  virality?: ViralityProvider;
}

/**
 * Instantiates the concrete provider clients a campaign was configured to
 * use. Because everything is driven off providerRegistry entries (kind +
 * baseUrl + apiKeyEnv + model), swapping in a different LLM, image, or video
 * backend is a config change, not a code change.
 */
export function buildCampaignProviders(config: AppConfig): CampaignProviders {
  const scriptCfg = findProvider(config, config.providers.script);
  const videoCfg = findProvider(config, config.providers.video);

  const llm = buildLLMProvider(scriptCfg);
  const video = buildVideoProvider(videoCfg);

  const imageCfg = config.providers.image ? findProvider(config, config.providers.image) : undefined;
  const voiceCfg = config.providers.voice ? findProvider(config, config.providers.voice) : undefined;
  const viralityCfg = config.providers.virality ? findProvider(config, config.providers.virality) : undefined;

  return {
    llm,
    video,
    image: imageCfg ? buildImageProvider(imageCfg) : undefined,
    voice: voiceCfg?.kind === "elevenlabs" ? new ElevenLabsClient(voiceCfg) : undefined,
    virality: viralityCfg ? buildViralityProvider(viralityCfg) : undefined,
  };
}

function buildVideoProvider(cfg: ProviderConfig): VideoProvider {
  if (cfg.kind === "higgsfield") return new HiggsfieldClient(cfg);
  throw new Error(`Provider "${cfg.id}" (kind=${cfg.kind}) does not support video generation`);
}

function buildImageProvider(cfg: ProviderConfig): ImageProvider {
  if (cfg.kind === "higgsfield") return new HiggsfieldClient(cfg);
  if (cfg.kind === "leonardo") return new LeonardoClient(cfg);
  throw new Error(`Provider "${cfg.id}" (kind=${cfg.kind}) does not support image generation`);
}

function buildViralityProvider(cfg: ProviderConfig): ViralityProvider {
  if (cfg.kind === "higgsfield") return new HiggsfieldClient(cfg);
  throw new Error(`Provider "${cfg.id}" (kind=${cfg.kind}) does not support virality prediction`);
}

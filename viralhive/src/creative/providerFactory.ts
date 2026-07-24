import type { AppConfig, ProviderConfig } from "../config/types.js";
import { providerChain } from "../config/config.js";
import type { ImageProvider, LLMProvider, VideoProvider, ViralityProvider, VoiceProvider } from "./types.js";
import { buildLLMProvider } from "./genericLLM.js";
import { HiggsfieldClient } from "./higgsfield.js";
import { LeonardoClient } from "./leonardo.js";
import { ElevenLabsClient } from "./elevenlabs.js";
import { FailoverLLM, FailoverVideoProvider } from "../core/failover.js";

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
 * backend is a config change, not a code change. `providers.script`/`video`
 * may be a single id or a priority-ordered array — arrays get wrapped in a
 * FailoverLLM/FailoverVideoProvider so a dead primary provider doesn't take
 * the whole pipeline down (see core/failover.ts).
 */
export function buildCampaignProviders(config: AppConfig): CampaignProviders {
  const llm = buildFailoverLLM(config, config.providers.script);
  const video = buildFailoverVideo(config, config.providers.video);

  const imageIds = config.providers.image ? providerChain(config.providers.image) : [];
  const voiceIds = config.providers.voice ? providerChain(config.providers.voice) : [];
  const viralityIds = config.providers.virality ? providerChain(config.providers.virality) : [];

  const imageCfg = imageIds[0] ? findProvider(config, imageIds[0]) : undefined;
  const voiceCfg = voiceIds[0] ? findProvider(config, voiceIds[0]) : undefined;
  const viralityCfg = viralityIds[0] ? findProvider(config, viralityIds[0]) : undefined;

  return {
    llm,
    video,
    image: imageCfg ? buildImageProvider(imageCfg) : undefined,
    voice: voiceCfg?.kind === "elevenlabs" ? new ElevenLabsClient(voiceCfg) : undefined,
    virality: viralityCfg ? buildViralityProvider(viralityCfg) : undefined,
  };
}

function buildFailoverLLM(config: AppConfig, ref: string | string[]): LLMProvider {
  const ids = providerChain(ref);
  const instances = ids.map((id) => buildLLMProvider(findProvider(config, id)));
  return instances.length > 1 ? new FailoverLLM(instances) : instances[0];
}

function buildFailoverVideo(config: AppConfig, ref: string | string[]): VideoProvider {
  const ids = providerChain(ref);
  const instances = ids.map((id) => buildVideoProvider(findProvider(config, id)));
  return instances.length > 1 ? new FailoverVideoProvider(instances) : instances[0];
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

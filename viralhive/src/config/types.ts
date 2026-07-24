export type Platform =
  | "tiktok"
  | "instagram"
  | "facebook"
  | "youtube"
  | "x"
  | "linkedin"
  | "pinterest"
  | "webhook";

export interface AccountConfig {
  /** Stable id used everywhere downstream (logs, DB rows, scheduler jobs). */
  id: string;
  platform: Platform;
  displayName: string;
  /** Env var names, never raw secrets. Resolved at runtime via process.env. */
  credentials: Record<string, string>;
  niche: string;
  postsPerDay: number;
  /** 24h "HH:mm" local-time slots; scheduler fires one job per slot. */
  postingWindow: string[];
  timezone: string;
  enabled: boolean;
  webhookUrl?: string;
}

export interface ProviderConfig {
  id: string;
  kind: "llm-openai-compatible" | "llm-anthropic" | "higgsfield" | "leonardo" | "elevenlabs";
  baseUrl?: string;
  apiKeyEnv: string;
  model?: string;
}

export interface CampaignConfig {
  id: string;
  name: string;
  niche: string;
  goal: string;
  toneKeywords: string[];
  bannedTopics: string[];
  platforms: Platform[];
  accountIds: string[];
  qualityThreshold: number;
  maxRegenerationAttempts: number;
  videoLengthSeconds: number;
  autopilot: boolean;
}

export interface AppConfig {
  accounts: AccountConfig[];
  campaigns: CampaignConfig[];
  providers: {
    script: string;
    video: string;
    image?: string;
    voice?: string;
    virality?: string;
  };
  providerRegistry: ProviderConfig[];
  dbPath: string;
  logLevel: string;
}

export interface ContentBrief {
  campaignId: string;
  topic: string;
  hook: string;
  script: string;
  caption: string;
  hashtags: string[];
  musicSuggestion?: string;
}

export interface ContentItem {
  id: string;
  campaignId: string;
  brief: ContentBrief;
  videoAssetUrl?: string;
  videoLocalPath?: string;
  thumbnailUrl?: string;
  status: "drafting" | "generating" | "scoring" | "ready" | "rejected" | "posted" | "failed";
  qualityScore?: QualityScore;
  attempts: number;
  createdAt: string;
}

export interface QualityScore {
  overall: number;
  hookStrength: number;
  pacing: number;
  visualQuality: number;
  audioQuality: number;
  trendAlignment: number;
  captionQuality: number;
  policyCompliant: boolean;
  viralityPrediction?: number;
  notes: string[];
}

export interface PostResult {
  accountId: string;
  platform: Platform;
  contentItemId: string;
  success: boolean;
  remoteId?: string;
  remoteUrl?: string;
  error?: string;
  postedAt: string;
}

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
  /** Learns each account's best-performing posting hours from engagement history
   *  instead of only using the static postingWindow. Falls back to postingWindow
   *  until enough post-performance data has been collected. */
  smartScheduling: boolean;
  /** Auto-replies to comments/DMs on this campaign's posts. */
  engagementAutoReply: boolean;
  /** If set, generated content embeds this product (video reference image,
   *  checkout CTA, shoppable caption) — see commerce/productPlacement.ts. */
  productId?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  imageUrls: string[];
  /** Existing Stripe Price id (price_...). Preferred over ad-hoc price data. */
  stripePriceId?: string;
}

export interface CommerceConfig {
  stripeSecretKeyEnv?: string;
  /** Used to build/track UTM-tagged checkout links, e.g. https://buy.yourbrand.com */
  checkoutBaseUrl?: string;
}

export interface AppConfig {
  accounts: AccountConfig[];
  campaigns: CampaignConfig[];
  products: Product[];
  commerce: CommerceConfig;
  providers: {
    /** A single provider id, or a priority-ordered fallback chain for self-healing. */
    script: string | string[];
    video: string | string[];
    image?: string | string[];
    voice?: string | string[];
    virality?: string | string[];
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
  /** SEO metadata — see src/seo/seo.ts. */
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  altText?: string;
  /** Commerce — set when the campaign has a productId. */
  productId?: string;
  checkoutUrl?: string;
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
  /** Populated once analytics/collector.ts pulls post performance. Feeds the
   *  learning engine's "which topics/hooks actually work" feedback loop. */
  engagementScore?: number;
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

export interface EngagementSnapshot {
  postId: string;
  accountId: string;
  platform: Platform;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  newFollowers: number;
  collectedAt: string;
}

export interface InboundComment {
  id: string;
  platform: Platform;
  accountId: string;
  postRemoteId: string;
  authorHandle: string;
  text: string;
  createdAt: string;
}

export interface EngagementReply {
  commentId: string;
  text: string;
  isSalesInquiry: boolean;
}

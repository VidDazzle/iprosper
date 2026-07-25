import { sqliteTable, integer, text, real, primaryKey } from 'drizzle-orm/sqlite-core';

export const emailCaptures = sqliteTable('email_captures', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull(),
  passwordAttempt: text('password_attempt').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: text('created_at').notNull(),
});

// ---------------------------------------------------------------------------
// ViralHive: config lives in the DB (editable from the dashboard) instead of
// a hand-edited accounts.yaml. Secrets (access tokens, API keys) are stored
// encrypted — see src/lib/viralhive/crypto.ts.
// ---------------------------------------------------------------------------

export const viralhiveAccounts = sqliteTable('viralhive_accounts', {
  id: text('id').primaryKey(),
  platform: text('platform').notNull(), // tiktok | instagram | facebook | youtube | x | linkedin | pinterest | webhook
  displayName: text('display_name').notNull(),
  credentialsEncrypted: text('credentials_encrypted').notNull().default('{}'), // JSON map, AES-GCM encrypted
  niche: text('niche').notNull().default('general'),
  postsPerDay: integer('posts_per_day').notNull().default(1),
  postingWindow: text('posting_window').notNull().default('["09:00"]'), // JSON string[]
  timezone: text('timezone').notNull().default('UTC'),
  webhookUrl: text('webhook_url'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const viralhiveProviders = sqliteTable('viralhive_providers', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(), // llm-openai-compatible | llm-anthropic | higgsfield | leonardo | elevenlabs
  baseUrl: text('base_url'),
  model: text('model'),
  apiKeyEncrypted: text('api_key_encrypted').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const viralhiveProducts = sqliteTable('viralhive_products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  priceCents: integer('price_cents').notNull().default(0),
  currency: text('currency').notNull().default('usd'),
  imageUrls: text('image_urls').notNull().default('[]'), // JSON string[]
  stripePriceId: text('stripe_price_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const viralhiveCampaigns = sqliteTable('viralhive_campaigns', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  niche: text('niche').notNull(),
  goal: text('goal').notNull(),
  toneKeywords: text('tone_keywords').notNull().default('[]'), // JSON string[]
  bannedTopics: text('banned_topics').notNull().default('[]'), // JSON string[]
  accountIds: text('account_ids').notNull().default('[]'), // JSON string[]
  scriptProviderIds: text('script_provider_ids').notNull(), // JSON string[] — failover chain
  videoProviderIds: text('video_provider_ids').notNull(), // JSON string[] — failover chain
  imageProviderId: text('image_provider_id'),
  voiceProviderId: text('voice_provider_id'),
  viralityProviderId: text('virality_provider_id'),
  qualityThreshold: real('quality_threshold').notNull().default(9.2),
  maxRegenerationAttempts: integer('max_regeneration_attempts').notNull().default(4),
  videoLengthSeconds: integer('video_length_seconds').notNull().default(30),
  autopilot: integer('autopilot', { mode: 'boolean' }).notNull().default(true),
  smartScheduling: integer('smart_scheduling', { mode: 'boolean' }).notNull().default(true),
  engagementAutoReply: integer('engagement_auto_reply', { mode: 'boolean' }).notNull().default(true),
  productId: text('product_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const viralhiveSettings = sqliteTable('viralhive_settings', {
  key: text('key').primaryKey(), // 'stripeSecretKeyEncrypted' | 'checkoutBaseUrl' | 'adminPasswordHash' | 'cronSecret'
  value: text('value').notNull(),
});

// --- Execution state (mirrors the standalone daemon's SQLite tables) ---

export const viralhiveContentItems = sqliteTable('viralhive_content_items', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull(),
  payload: text('payload').notNull(), // JSON ContentItem
  status: text('status').notNull(),
  engagementScore: real('engagement_score'),
  createdAt: text('created_at').notNull(),
});

export const viralhivePosts = sqliteTable('viralhive_posts', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  platform: text('platform').notNull(),
  contentItemId: text('content_item_id').notNull(),
  success: integer('success', { mode: 'boolean' }).notNull(),
  remoteId: text('remote_id'),
  remoteUrl: text('remote_url'),
  error: text('error'),
  postedAt: text('posted_at').notNull(),
});

export const viralhiveRunLog = sqliteTable('viralhive_run_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  level: text('level').notNull(),
  message: text('message').notNull(),
  meta: text('meta'),
  createdAt: text('created_at').notNull(),
});

export const viralhiveCampaignState = sqliteTable('viralhive_campaign_state', {
  campaignId: text('campaign_id').primaryKey(),
  autopilotOverride: integer('autopilot_override', { mode: 'boolean' }),
  postsToday: integer('posts_today').notNull().default(0),
  dayBucket: text('day_bucket'),
});

export const viralhivePostMetrics = sqliteTable('viralhive_post_metrics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  postId: text('post_id').notNull(),
  accountId: text('account_id').notNull(),
  platform: text('platform').notNull(),
  views: integer('views').notNull().default(0),
  likes: integer('likes').notNull().default(0),
  comments: integer('comments').notNull().default(0),
  shares: integer('shares').notNull().default(0),
  clicks: integer('clicks').notNull().default(0),
  newFollowers: integer('new_followers').notNull().default(0),
  collectedAt: text('collected_at').notNull(),
});

export const viralhiveTimingStats = sqliteTable(
  'viralhive_timing_stats',
  {
    accountId: text('account_id').notNull(),
    dayOfWeek: integer('day_of_week').notNull(),
    hour: integer('hour').notNull(),
    avgScore: real('avg_score').notNull().default(0),
    sampleCount: integer('sample_count').notNull().default(0),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.accountId, table.dayOfWeek, table.hour] }),
  })
);

export const viralhiveHandledComments = sqliteTable('viralhive_handled_comments', {
  commentId: text('comment_id').primaryKey(),
  handledAt: text('handled_at').notNull(),
});
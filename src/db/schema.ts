import { sqliteTable, integer, text, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

// ---------------------------------------------------------------------------
// Existing table (unchanged) — email captures for the marketing site
// ---------------------------------------------------------------------------
export const emailCaptures = sqliteTable('email_captures', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull(),
  passwordAttempt: text('password_attempt').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: text('created_at').notNull(),
});

// ===========================================================================
// Social prospecting pipeline
//
// Design principle: every source is an OFFICIAL platform API. We ingest only
// public posts/comments (and mentions on the operator's own assets), never
// private DMs, never scraped sessions. Outreach is drafted by AI and sent
// from the operator's own accounts through official endpoints, subject to a
// human review queue, disclosure injection, suppression checks, and frequency
// caps. Nothing here evades platform detection.
// ===========================================================================

/**
 * A connected social account, keyed by platform. Credentials are stored as an
 * opaque encrypted blob reference (we keep only a pointer + status here; the
 * actual OAuth tokens live in the secrets manager / env, never in the row).
 */
export const connectors = sqliteTable('connectors', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // 'x' | 'reddit' | 'youtube' | 'instagram' | 'tiktok' | 'linkedin'
  platform: text('platform').notNull(),
  // Human label, e.g. "@iprosper on X"
  displayName: text('display_name').notNull(),
  // Handle / account id on the platform
  accountHandle: text('account_handle'),
  externalAccountId: text('external_account_id'),
  // 'connected' | 'disconnected' | 'error' | 'disabled_by_policy'
  status: text('status').notNull().default('disconnected'),
  // If a platform policy change trips the ToS guard, we record why + when.
  policyBlockReason: text('policy_block_reason'),
  // Scopes granted at connect time (JSON array of strings)
  scopes: text('scopes'),
  // Reference to where the encrypted token lives (e.g. an env key or KMS id).
  // We deliberately do NOT store raw tokens in the DB.
  credentialRef: text('credential_ref'),
  tokenExpiresAt: text('token_expires_at'),
  lastPolledAt: text('last_polled_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => ({
  platformIdx: index('connectors_platform_idx').on(t.platform),
}));

/**
 * Boolean/keyword rules used as the cheap first-pass filter before the LLM
 * intent classifier runs. Terms are matched against public post text.
 */
export const termRules = sqliteTable('term_rules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  // Boolean expression, e.g. `("recommend" OR "looking for") AND "supplement"`
  expression: text('expression').notNull(),
  // Optional platform scope; null = all connected platforms
  platform: text('platform'),
  // Campaign / product bucket this rule feeds
  campaign: text('campaign'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => ({
  enabledIdx: index('term_rules_enabled_idx').on(t.enabled),
}));

/**
 * A raw public mention/post/comment captured from a platform. This is the
 * evidence trail. We store the platform's own permalink so everything is
 * auditable back to the public source.
 */
export const mentions = sqliteTable('mentions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  platform: text('platform').notNull(),
  connectorId: integer('connector_id').references(() => connectors.id),
  // Platform-native id for dedupe (e.g. tweet id, reddit fullname)
  externalId: text('external_id').notNull(),
  permalink: text('permalink'),
  authorHandle: text('author_handle'),
  authorExternalId: text('author_external_id'),
  content: text('content').notNull(),
  lang: text('lang'),
  // ISO timestamp the content was posted on-platform
  postedAt: text('posted_at'),
  // Which rule first surfaced it
  matchedRuleId: integer('matched_rule_id').references(() => termRules.id),
  // 'new' | 'classified' | 'discarded'
  status: text('status').notNull().default('new'),
  capturedAt: text('captured_at').notNull(),
}, (t) => ({
  dedupeIdx: uniqueIndex('mentions_platform_external_idx').on(t.platform, t.externalId),
  statusIdx: index('mentions_status_idx').on(t.status),
}));

/**
 * Output of the LLM intent classifier for a mention. Kept separate so we can
 * re-classify with newer models without destroying the raw evidence.
 */
export const intentSignals = sqliteTable('intent_signals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  mentionId: integer('mention_id').notNull().references(() => mentions.id),
  // 0..1 probability that this is a real buying/interest signal
  buyingIntent: real('buying_intent').notNull().default(0),
  urgency: real('urgency').notNull().default(0),
  // Detected pain point / need, free text
  painPoint: text('pain_point'),
  // 'positive' | 'neutral' | 'negative' | 'crisis'
  sentiment: text('sentiment'),
  // If sentiment == 'crisis' we gate outreach entirely
  crisisFlag: integer('crisis_flag', { mode: 'boolean' }).notNull().default(false),
  budgetSignal: text('budget_signal'),
  // Model + version used, for reproducibility
  model: text('model'),
  rationale: text('rationale'),
  createdAt: text('created_at').notNull(),
}, (t) => ({
  mentionIdx: index('intent_signals_mention_idx').on(t.mentionId),
}));

/**
 * A de-duplicated prospect (a person/account we may reach out to), scored and
 * queued. One prospect can be linked to many mentions over time.
 */
export const prospects = sqliteTable('prospects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  platform: text('platform').notNull(),
  authorHandle: text('author_handle'),
  authorExternalId: text('author_external_id').notNull(),
  // Rolled-up lead score 0..100
  score: real('score').notNull().default(0),
  // Best detected pain point across their mentions
  topPainPoint: text('top_pain_point'),
  // 'queued' | 'suppressed' | 'contacted' | 'converted' | 'rejected' | 'cooldown'
  status: text('status').notNull().default('queued'),
  // Jurisdiction flag for privacy regime handling (e.g. 'EU', 'US-CA', 'US', null)
  jurisdiction: text('jurisdiction'),
  // Earliest time we're allowed to contact again (cooldown enforcement)
  cooldownUntil: text('cooldown_until'),
  lastContactedAt: text('last_contacted_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => ({
  identityIdx: uniqueIndex('prospects_identity_idx').on(t.platform, t.authorExternalId),
  statusScoreIdx: index('prospects_status_score_idx').on(t.status, t.score),
}));

/**
 * Products/services available to promote, from supplier and affiliate
 * networks (Alibaba, CJ Dropshipping, AliExpress, Amazon Associates,
 * ShareASale, Impact, ClickBank, or the operator's own catalog).
 */
export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // 'alibaba' | 'cj' | 'aliexpress' | 'amazon_associates' | 'shareasale' |
  // 'impact' | 'clickbank' | 'own'
  source: text('source').notNull(),
  externalId: text('external_id'),
  title: text('title').notNull(),
  description: text('description'),
  category: text('category'),
  priceUsd: real('price_usd'),
  // For dropship items
  supplierCostUsd: real('supplier_cost_usd'),
  marginPct: real('margin_pct'),
  shipDaysMin: integer('ship_days_min'),
  shipDaysMax: integer('ship_days_max'),
  reviewScore: real('review_score'),
  reviewCount: integer('review_count'),
  // Affiliate details
  affiliateNetwork: text('affiliate_network'),
  affiliatePayoutUsd: real('affiliate_payout_usd'),
  affiliateUrl: text('affiliate_url'),
  landingUrl: text('landing_url'),
  // Embedding vector (JSON array) for semantic matching against pain points
  embedding: text('embedding'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => ({
  sourceIdx: index('products_source_idx').on(t.source),
  activeIdx: index('products_active_idx').on(t.active),
}));

/**
 * A drafted (and possibly sent) outreach message. Always starts life in the
 * human review queue. Disclosure text is stored explicitly so audits can
 * confirm FTC/affiliate disclosure was present.
 */
export const outreachMessages = sqliteTable('outreach_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  prospectId: integer('prospect_id').notNull().references(() => prospects.id),
  productId: integer('product_id').references(() => products.id),
  connectorId: integer('connector_id').references(() => connectors.id),
  mentionId: integer('mention_id').references(() => mentions.id),
  // 'public_reply' | 'dm'
  channel: text('channel').notNull().default('public_reply'),
  draftBody: text('draft_body').notNull(),
  // The disclosure appended (affiliate relationship / bot disclosure)
  disclosureText: text('disclosure_text'),
  // A/B template variant used
  templateVariant: text('template_variant'),
  // 'pending_review' | 'approved' | 'rejected' | 'sent' | 'failed'
  status: text('status').notNull().default('pending_review'),
  reviewedBy: text('reviewed_by'),
  rejectionReason: text('rejection_reason'),
  externalMessageId: text('external_message_id'),
  sendError: text('send_error'),
  // UTM / attribution tag baked into any link
  attributionTag: text('attribution_tag'),
  scheduledFor: text('scheduled_for'),
  sentAt: text('sent_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => ({
  statusIdx: index('outreach_status_idx').on(t.status),
  prospectIdx: index('outreach_prospect_idx').on(t.prospectId),
}));

/**
 * Global suppression / opt-out list. A hit here blocks all outreach to an
 * identity regardless of score. Supports GDPR/CCPA "do not contact" requests.
 */
export const suppressionList = sqliteTable('suppression_list', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  platform: text('platform'),
  authorHandle: text('author_handle'),
  authorExternalId: text('author_external_id'),
  reason: text('reason'),
  // 'opt_out' | 'complaint' | 'legal' | 'manual' | 'bounce'
  source: text('source').notNull().default('manual'),
  createdAt: text('created_at').notNull(),
}, (t) => ({
  identityIdx: index('suppression_identity_idx').on(t.platform, t.authorExternalId),
  handleIdx: index('suppression_handle_idx').on(t.authorHandle),
}));

/**
 * Outcomes used by the self-optimizing feedback loop: which template/product
 * combos actually earn replies and conversions. Drives A/B decisions and
 * classifier retraining datasets.
 */
export const outreachOutcomes = sqliteTable('outreach_outcomes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  outreachId: integer('outreach_id').notNull().references(() => outreachMessages.id),
  // 'no_response' | 'reply' | 'click' | 'conversion' | 'complaint' | 'block'
  outcome: text('outcome').notNull(),
  revenueUsd: real('revenue_usd'),
  detail: text('detail'),
  occurredAt: text('occurred_at').notNull(),
  createdAt: text('created_at').notNull(),
}, (t) => ({
  outreachIdx: index('outcomes_outreach_idx').on(t.outreachId),
  outcomeIdx: index('outcomes_outcome_idx').on(t.outcome),
}));

/**
 * Append-only audit log for compliance-sensitive actions.
 */
export const auditLog = sqliteTable('audit_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  actor: text('actor'),
  action: text('action').notNull(),
  entityType: text('entity_type'),
  entityId: integer('entity_id'),
  detail: text('detail'),
  createdAt: text('created_at').notNull(),
}, (t) => ({
  actionIdx: index('audit_action_idx').on(t.action),
}));

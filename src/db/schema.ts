import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const emailCaptures = sqliteTable('email_captures', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull(),
  passwordAttempt: text('password_attempt').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: text('created_at').notNull(),
});

/**
 * Inbound leads captured from the site and from paid social / search ads.
 * Marketing attribution (UTM + click IDs) lets us tie enrollments back to the
 * campaign, ad set, and creative that produced them.
 */
export const leads = sqliteTable('leads', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name'),
  email: text('email').notNull(),
  phone: text('phone'),
  // Program qualification fields
  debtAmount: integer('debt_amount'),
  debtTypes: text('debt_types'), // JSON-encoded string[]
  payStatus: text('pay_status'),
  stateCode: text('state_code'),
  // TCPA / consent
  contactConsent: integer('contact_consent', { mode: 'boolean' }).notNull().default(false),
  // Attribution
  source: text('source'), // e.g. facebook, instagram, tiktok, youtube, google, x, organic
  medium: text('medium'), // e.g. paid_social, cpc, video, organic
  campaign: text('campaign'),
  adContent: text('ad_content'),
  term: text('term'),
  referrer: text('referrer'),
  landingPath: text('landing_path'),
  clickId: text('click_id'), // fbclid / ttclid / gclid, etc.
  // Ops
  status: text('status').notNull().default('new'), // new | contacted | qualified | enrolled | disqualified
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: text('created_at').notNull(),
});

/**
 * Client portal accounts. Each enrolled client gets a unique login. Passwords
 * are stored only as scrypt hashes (salt:hash); plaintext is never persisted.
 * `opsClientId` links the account to its case in the operations system.
 */
export const clientUsers = sqliteTable('client_users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  phone: text('phone'),
  opsClientId: text('ops_client_id'), // e.g. SOLV-10248
  // Approval channel preferences
  notifyEmail: integer('notify_email', { mode: 'boolean' }).notNull().default(true),
  notifySms: integer('notify_sms', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  lastLoginAt: text('last_login_at'),
});

/**
 * Documents uploaded by clients (statements, settlement letters, legal notices,
 * pay stubs, etc.) and the AI analysis produced immediately on upload.
 */
export const clientDocuments = sqliteTable('client_documents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clientId: text('client_id').notNull(), // opsClientId
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type'),
  sizeBytes: integer('size_bytes'),
  declaredType: text('declared_type'), // what the client said it is
  // AI analysis (Atlas et al.)
  analyzedType: text('analyzed_type'),
  analyzedAgent: text('analyzed_agent'),
  findings: text('findings'), // JSON string[]
  recommendedAction: text('recommended_action'),
  priority: text('priority').notNull().default('normal'), // normal | high | urgent
  status: text('status').notNull().default('analyzing'), // analyzing | analyzed | action_created
  createdAt: text('created_at').notNull(),
});

/**
 * Actions requiring the client's approval (e.g. a settlement offer). Clients
 * approve/reject in the portal or via a signed one-click link sent by email/SMS.
 */
export const clientApprovals = sqliteTable('client_approvals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clientId: text('client_id').notNull(),
  agent: text('agent').notNull(),
  title: text('title').notNull(),
  detail: text('detail').notNull(),
  amount: integer('amount'),
  creditor: text('creditor'),
  documentId: integer('document_id'),
  status: text('status').notNull().default('pending'), // pending | approved | rejected | expired
  channelsSent: text('channels_sent'), // JSON string[]
  decidedAt: text('decided_at'),
  decidedVia: text('decided_via'), // portal | email | sms
  expiresAt: text('expires_at'),
  createdAt: text('created_at').notNull(),
});

/** In-app notifications shown in the portal bell. */
export const clientNotifications = sqliteTable('client_notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clientId: text('client_id').notNull(),
  message: text('message').notNull(),
  href: text('href'),
  read: integer('read', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
});
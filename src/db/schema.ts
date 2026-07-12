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
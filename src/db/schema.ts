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
 * AI Calendar — events managed by the autonomous scheduling engine and the
 * voice agent. All times are stored as ISO-8601 UTC strings.
 */
export const calendarEvents = sqliteTable('calendar_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description'),
  location: text('location'),
  // ISO-8601 UTC
  startsAt: text('starts_at').notNull(),
  endsAt: text('ends_at').notNull(),
  timezone: text('timezone').notNull().default('America/New_York'),
  // scheduled | confirmed | cancelled | completed | tentative
  status: text('status').notNull().default('scheduled'),
  // Comma-separated emails invited to the event.
  attendees: text('attendees'),
  organizerEmail: text('organizer_email'),
  meetingUrl: text('meeting_url'),
  // What created this: voice_agent | ai | manual | api
  source: text('source').notNull().default('manual'),
  // Freeform notes captured by the voice agent (call summary, caller intent).
  agentNotes: text('agent_notes'),
  // Minutes before start to fire a reminder (null = no reminder).
  reminderMinutes: integer('reminder_minutes'),
  reminderSent: integer('reminder_sent', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/**
 * Recurring availability windows the AI scheduler and voice agent are allowed
 * to book inside of. dayOfWeek: 0 = Sunday ... 6 = Saturday.
 */
export const availabilityRules = sqliteTable('availability_rules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  dayOfWeek: integer('day_of_week').notNull(),
  // "HH:MM" local (24h) in the rule's timezone.
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  timezone: text('timezone').notNull().default('America/New_York'),
  // Default length of a booked slot in minutes.
  slotMinutes: integer('slot_minutes').notNull().default(30),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
});

/**
 * Encrypted mailbox. Body and subject are encrypted at rest (AES-256-GCM);
 * only ciphertext lives in the row. Preview is a short redacted snippet the
 * voice agent can read aloud without decrypting the full body.
 */
export const mailMessages = sqliteTable('mail_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // Thread grouping id (shared across replies).
  threadId: text('thread_id').notNull(),
  direction: text('direction').notNull(), // inbound | outbound
  fromEmail: text('from_email').notNull(),
  toEmails: text('to_emails').notNull(), // comma-separated
  ccEmails: text('cc_emails'),
  // Encrypted payloads: JSON { iv, tag, data } base64.
  subjectEncrypted: text('subject_encrypted').notNull(),
  bodyEncrypted: text('body_encrypted').notNull(),
  // Non-sensitive snippet for list views / voice preview.
  preview: text('preview'),
  // unread | read | archived | sent | draft | trash
  status: text('status').notNull().default('unread'),
  starred: integer('starred', { mode: 'boolean' }).notNull().default(false),
  // low | normal | high — set by AI triage.
  priority: text('priority').notNull().default('normal'),
  // AI-derived single-word category (billing, sales, support, personal...).
  category: text('category'),
  source: text('source').notNull().default('manual'), // voice_agent | ai | manual | api
  createdAt: text('created_at').notNull(),
});

/**
 * Large email attachments. The actual bytes live in object storage (S3 / R2 /
 * B2), NOT in the database — a full-length video is far too large for a DB row
 * and for a serverless request body. This table holds only metadata plus the
 * storage key and an envelope-wrapped per-file encryption key. Uploads go
 * directly from the client to storage via presigned (multipart) URLs, so file
 * size is bounded by the storage provider, not by the app.
 */
export const mailAttachments = sqliteTable('mail_attachments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // Linked once the message is sent; null while still a draft/pending upload.
  messageId: integer('message_id'),
  threadId: text('thread_id'),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull().default('application/octet-stream'),
  // 64-bit — comfortably handles multi-GB / full-length video.
  sizeBytes: integer('size_bytes').notNull(),
  storageProvider: text('storage_provider').notNull().default('s3'),
  storageKey: text('storage_key').notNull(),
  // Set while a multipart upload is in flight; cleared on completion.
  uploadId: text('upload_id'),
  // pending | uploaded | failed
  status: text('status').notNull().default('pending'),
  // Envelope-encrypted per-file data key (base64 JSON). Enables optional
  // client-side E2E encryption; the blob is also encrypted at rest by the
  // bucket's default encryption.
  wrappedKey: text('wrapped_key'),
  checksum: text('checksum'),
  createdAt: text('created_at').notNull(),
  uploadedAt: text('uploaded_at'),
});

/**
 * Address book shared by the AI email + calendar so the voice agent can
 * resolve "email John" or "book a call with the Acme team".
 */
export const mailContacts = sqliteTable('mail_contacts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  company: text('company'),
  phone: text('phone'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
});

// ---------------------------------------------------------------------------
// AI Video Meetings ("Evolve Meet")
// ---------------------------------------------------------------------------

/**
 * A video meeting room. The live media plane (WebRTC SFU) plugs in separately;
 * this row is the durable record — settings, lifecycle, and links to the
 * calendar. hostDefaults gate what features are even offered in the room.
 */
export const meetings = sqliteTable('meetings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  roomCode: text('room_code').notNull(), // short shareable join code
  title: text('title').notNull(),
  hostName: text('host_name'),
  hostEmail: text('host_email'),
  status: text('status').notNull().default('scheduled'), // scheduled | live | ended
  calendarEventId: integer('calendar_event_id'), // optional link to calendar_events
  // Host toggles: whether the room offers these at all (participants still consent).
  recordingOffered: integer('recording_offered', { mode: 'boolean' }).notNull().default(true),
  transcriptionOffered: integer('transcription_offered', { mode: 'boolean' }).notNull().default(true),
  summaryOffered: integer('summary_offered', { mode: 'boolean' }).notNull().default(true),
  startedAt: text('started_at'),
  endedAt: text('ended_at'),
  createdAt: text('created_at').notNull(),
});

/**
 * A participant in a meeting, with their EXPRESS per-feature consent decisions.
 * The consent columns are the legal record captured by the authorization screen
 * shown before anyone joins — each is an explicit opt-in/opt-out with a
 * timestamp and the IP it was recorded from.
 */
export const meetingParticipants = sqliteTable('meeting_participants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  meetingId: integer('meeting_id').notNull(),
  name: text('name').notNull(),
  email: text('email'),
  role: text('role').notNull().default('participant'), // host | participant
  // Express consent — captured on the authorization screen. Default false =
  // opted out until the participant explicitly opts in.
  consentRecording: integer('consent_recording', { mode: 'boolean' }).notNull().default(false),
  consentTranscription: integer('consent_transcription', { mode: 'boolean' }).notNull().default(false),
  consentSummary: integer('consent_summary', { mode: 'boolean' }).notNull().default(false),
  consentReports: integer('consent_reports', { mode: 'boolean' }).notNull().default(false),
  consentDecidedAt: text('consent_decided_at'),
  consentIp: text('consent_ip'),
  joinedAt: text('joined_at'),
  leftAt: text('left_at'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
});

/**
 * A shared asset in a meeting (video, image, slideshow, document). Bytes live
 * in object storage (reusing the same presigned-upload layer as mail
 * attachments); this row tracks the current revision so reviews attach to the
 * right version.
 */
export const meetingAssets = sqliteTable('meeting_assets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  meetingId: integer('meeting_id').notNull(),
  kind: text('kind').notNull().default('image'), // video | image | slideshow | document | link
  title: text('title').notNull(),
  // For kind='link' the shared resource is a URL, no upload.
  url: text('url'),
  mimeType: text('mime_type'),
  sizeBytes: integer('size_bytes'),
  storageKey: text('storage_key'),
  uploadId: text('upload_id'),
  status: text('status').notNull().default('pending'), // pending | uploaded | failed
  revision: integer('revision').notNull().default(1),
  uploadedByName: text('uploaded_by_name'),
  uploadedByEmail: text('uploaded_by_email'),
  createdAt: text('created_at').notNull(),
});

/**
 * A per-revision review on a shared asset: the notes box + the Approved /
 * Not-Approved decision each client records against a specific revision.
 */
export const assetReviews = sqliteTable('asset_reviews', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  assetId: integer('asset_id').notNull(),
  revision: integer('revision').notNull(),
  reviewerName: text('reviewer_name').notNull(),
  reviewerEmail: text('reviewer_email'),
  decision: text('decision').notNull().default('pending'), // approved | not_approved | pending
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
});

/**
 * Live dictation / transcript lines captured during the meeting (browser speech
 * recognition posts these). The full transcript is assembled from these rows
 * and fed to the AI summarizer.
 */
export const meetingTranscriptLines = sqliteTable('meeting_transcript_lines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  meetingId: integer('meeting_id').notNull(),
  participantName: text('participant_name'),
  text: text('text').notNull(),
  at: text('at').notNull(),
});

/**
 * Generated meeting artifacts — recordings (metadata + storage key) and AI
 * summaries (content). Kept flexible so a meeting can have several.
 */
export const meetingArtifacts = sqliteTable('meeting_artifacts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  meetingId: integer('meeting_id').notNull(),
  kind: text('kind').notNull(), // recording | summary
  content: text('content'), // summary text / JSON
  storageKey: text('storage_key'), // recording object
  createdAt: text('created_at').notNull(),
});

/**
 * Ephemeral WebRTC signaling messages (SDP offers/answers, ICE candidates)
 * exchanged between peers via polling. A production deployment swaps this for a
 * WebSocket/SFU, but this keeps peer connections working out of the box.
 */
export const meetingSignals = sqliteTable('meeting_signals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  meetingId: integer('meeting_id').notNull(),
  fromPeer: text('from_peer').notNull(),
  toPeer: text('to_peer'), // null = broadcast
  kind: text('kind').notNull(), // offer | answer | ice | join | leave
  payload: text('payload'), // JSON
  createdAt: text('created_at').notNull(),
});

// ---------------------------------------------------------------------------
// Billing & metering — the three Evolve products, usage caps, profit guardrail
// ---------------------------------------------------------------------------

/** A paying customer account. In production this ties to auth; for now there's
 *  a primary account that the usage bar reflects. */
export const billingAccounts = sqliteTable('billing_accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name'),
  email: text('email'),
  isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
});

/** Purchasable plan tiers per product (calendar | email | meet). */
export const plans = sqliteTable('plans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  product: text('product').notNull(), // calendar | email | meet
  tier: text('tier').notNull(), // starter | pro | business
  name: text('name').notNull(),
  monthlyPriceCents: integer('monthly_price_cents').notNull(),
  includedUnits: integer('included_units').notNull(),
  unitLabel: text('unit_label').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
});

/** A customer's active subscription to one product, with the current billing
 *  period's usage and any prepaid overage credits remaining. */
export const productSubscriptions = sqliteTable('product_subscriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id').notNull(),
  product: text('product').notNull(),
  tier: text('tier').notNull(),
  includedUnits: integer('included_units').notNull(),
  usedUnits: integer('used_units').notNull().default(0),
  extraCredits: integer('extra_credits').notNull().default(0), // prepaid overage units
  periodStart: text('period_start').notNull(),
  periodEnd: text('period_end').notNull(),
  status: text('status').notNull().default('active'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/** Append-only metered-usage ledger: every billable event with its COST and
 *  the PRICE charged, so margin is provable and never negative. */
export const usageEvents = sqliteTable('usage_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id').notNull(),
  product: text('product').notNull(),
  kind: text('kind').notNull(),
  units: integer('units').notNull(),
  costCents: integer('cost_cents').notNull(),
  priceCents: integer('price_cents').notNull(),
  source: text('source').notNull().default('included'), // included | credit
  createdAt: text('created_at').notNull(),
});

// ---------------------------------------------------------------------------
// CRM — pipelines, stages, deals, leads
// ---------------------------------------------------------------------------

export const pipelines = sqliteTable('pipelines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
});

export const pipelineStages = sqliteTable('pipeline_stages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pipelineId: integer('pipeline_id').notNull(),
  name: text('name').notNull(),
  position: integer('position').notNull().default(0),
  kind: text('kind').notNull().default('open'), // open | won | lost
  createdAt: text('created_at').notNull(),
});

export const deals = sqliteTable('deals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pipelineId: integer('pipeline_id').notNull(),
  stageId: integer('stage_id').notNull(),
  title: text('title').notNull(),
  valueCents: integer('value_cents').notNull().default(0),
  contactName: text('contact_name'),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  company: text('company'),
  source: text('source'),
  notes: text('notes'),
  status: text('status').notNull().default('open'), // open | won | lost
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/** Raw inbound leads (capture forms, webinar signups). Convert into deals. */
export const leads = sqliteTable('leads', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  company: text('company'),
  source: text('source'), // capture_form | webinar | api | ...
  message: text('message'),
  status: text('status').notNull().default('new'), // new | contacted | qualified | converted | lost
  dealId: integer('deal_id'),
  createdAt: text('created_at').notNull(),
});

// ---------------------------------------------------------------------------
// Commerce — products + orders (shareable purchase page)
// ---------------------------------------------------------------------------

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  priceCents: integer('price_cents').notNull().default(0),
  currency: text('currency').notNull().default('usd'),
  imageUrl: text('image_url'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
});

export const orders = sqliteTable('orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').notNull(),
  buyerName: text('buyer_name'),
  buyerEmail: text('buyer_email'),
  amountCents: integer('amount_cents').notNull(),
  currency: text('currency').notNull().default('usd'),
  status: text('status').notNull().default('pending'), // pending | paid | cancelled
  provider: text('provider').notNull().default('manual'), // stripe | manual
  providerRef: text('provider_ref'),
  // Where the sale came from (e.g. a meeting/webinar room code).
  sourceContext: text('source_context'),
  createdAt: text('created_at').notNull(),
});

// ---------------------------------------------------------------------------
// Work-card scoring — clients rate work 1-10; feeds production improvement
// ---------------------------------------------------------------------------

export const workScores = sqliteTable('work_scores', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  targetType: text('target_type').notNull(), // meeting_asset | deliverable | deliverable_item
  targetId: integer('target_id').notNull(),
  score: integer('score').notNull(), // 1-10
  reviewerName: text('reviewer_name'),
  reviewerEmail: text('reviewer_email'),
  comment: text('comment'),
  // Denormalized for easy aggregation ("improve production").
  category: text('category'), // e.g. project type or asset kind
  createdAt: text('created_at').notNull(),
});

// ---------------------------------------------------------------------------
// Client project delivery ("Deliverables")
// ---------------------------------------------------------------------------

/**
 * A project delivery package handed off to a client — a completed website, a
 * Voice AI agent, documents, videos, links, etc. Carries an approval lifecycle
 * so the client can approve the whole delivery or request revisions.
 */
export const deliverables = sqliteTable('deliverables', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  publicId: text('public_id').notNull(), // shareable id for the client review link
  title: text('title').notNull(),
  clientName: text('client_name'),
  clientEmail: text('client_email'),
  projectType: text('project_type').notNull().default('other'), // voice_ai_agent | website | document | video | design | other
  message: text('message'), // note to the client
  // draft | delivered | approved | revision_requested
  status: text('status').notNull().default('draft'),
  deliveredAt: text('delivered_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/**
 * One item inside a delivery package. A file (object storage), a link, or a
 * pointer to a built asset like a Voice AI agent.
 */
export const deliverableItems = sqliteTable('deliverable_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  deliverableId: integer('deliverable_id').notNull(),
  kind: text('kind').notNull().default('file'), // file | link | voice_agent | video | image | document
  title: text('title').notNull(),
  description: text('description'),
  url: text('url'), // for link / voice_agent / external items
  mimeType: text('mime_type'),
  sizeBytes: integer('size_bytes'),
  storageKey: text('storage_key'),
  uploadId: text('upload_id'),
  status: text('status').notNull().default('ready'), // pending | ready | uploaded
  createdAt: text('created_at').notNull(),
});

/**
 * A client's decision on a delivery: approve, or request a revision WITH the
 * specific detailed text of what they want changed. May target the whole
 * delivery or a single item.
 */
export const deliverableReviews = sqliteTable('deliverable_reviews', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  deliverableId: integer('deliverable_id').notNull(),
  itemId: integer('item_id'), // null = the whole delivery
  reviewerName: text('reviewer_name').notNull(),
  reviewerEmail: text('reviewer_email'),
  decision: text('decision').notNull(), // approved | revision_requested
  // Required when decision = revision_requested: the specific requested change.
  revisionDetail: text('revision_detail'),
  createdAt: text('created_at').notNull(),
});

/**
 * Opt-in birthday list for the birthday-surprise mailer. Month/day are stored
 * separately so we can match "today's birthdays" regardless of year, and
 * lastGreetedYear guards against sending twice in the same year.
 */
export const birthdaySubscribers = sqliteTable('birthday_subscribers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  birthdate: text('birthdate').notNull(), // YYYY-MM-DD as provided
  birthMonth: integer('birth_month').notNull(), // 1-12
  birthDay: integer('birth_day').notNull(), // 1-31
  lastGreetedYear: integer('last_greeted_year'),
  createdAt: text('created_at').notNull(),
});

/**
 * Persisted results of every self-maintenance run (self-heal / security-audit /
 * optimize). This is the memory that makes the system "self-improving": each
 * run is scored and stored so trends are visible and the optimizer can learn
 * from history.
 */
export const maintenanceRuns = sqliteTable('maintenance_runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  kind: text('kind').notNull(), // heal | audit | optimize | full
  status: text('status').notNull().default('ok'), // ok | degraded | critical
  healthScore: integer('health_score'), // 0-100
  securityScore: integer('security_score'), // 0-100
  // JSON arrays.
  findings: text('findings'),
  remediations: text('remediations'),
  recommendations: text('recommendations'),
  applied: integer('applied', { mode: 'boolean' }).notNull().default(false),
  durationMs: integer('duration_ms'),
  trigger: text('trigger').notNull().default('manual'), // manual | cron | agent
  createdAt: text('created_at').notNull(),
});

/**
 * Append-only audit log of every action the voice agent / AI takes. Critical
 * for an autonomous system — this is the paper trail of what the agent did.
 */
export const voiceAgentLog = sqliteTable('voice_agent_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  action: text('action').notNull(),
  // JSON string of the request params.
  params: text('params'),
  // JSON string of the result.
  result: text('result'),
  status: text('status').notNull().default('ok'), // ok | error | rejected
  callId: text('call_id'),
  callerNumber: text('caller_number'),
  createdAt: text('created_at').notNull(),
});

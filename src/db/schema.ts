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
  kind: text('kind').notNull().default('image'), // video | image | slideshow | document
  title: text('title').notNull(),
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

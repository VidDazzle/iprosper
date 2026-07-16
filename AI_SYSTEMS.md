# iProsper Autonomous AI Calendar + Encrypted Email

Two connected systems that run scheduling and email for the evolve business, both
driven by the same engine your **AI voice agent** calls. Everything is built into
this Next.js app — no separate service to deploy.

- **AI Calendar** — natural-language scheduling, timezone-aware availability, a
  conflict-checked booking engine, and a live command-center dashboard.
- **Encrypted Email** — an AES-256-GCM-encrypted-at-rest mailbox with AI triage,
  AI drafting, and a full inbox/compose UI.
- **Voice-Agent API** — one authenticated endpoint the voice agent uses to book
  meetings, check availability, read/send mail, and manage contacts, with a
  full audit log of every autonomous action.

---

## What's real vs. what you plug in

This is genuine working software, but a few capabilities depend on external
accounts you connect — wired up cleanly and degrading gracefully until then:

| Capability | Status | To enable |
|---|---|---|
| Encrypted storage of mail (at rest) | ✅ Working now | Set `MAIL_ENCRYPTION_KEY` |
| Large attachments (docs, full-length video) | ✅ Working now | Set `S3_*` (S3/R2/B2/MinIO) |
| Scheduling engine, availability, conflict checks | ✅ Working now | — |
| Voice-agent action API + audit log | ✅ Working now | Set `VOICE_AGENT_API_KEY` |
| Calendar + mailbox dashboards | ✅ Working now | — |
| Self-healing + optimizing + security self-audit | ✅ Working now | Set `CRON_SECRET` for the daily schedule |
| Dependency threat patching (Dependabot + npm audit CI) | ✅ Working now | Enable Dependabot in the repo's Security settings |
| AI parsing / triage / drafting | ✅ Works (heuristic) | Add `ANTHROPIC_API_KEY` for full Claude intelligence (see `CODEX_HANDOFF.md`) |
| Actually sending mail over the internet | ⚙️ Needs provider | Set `RESEND_API_KEY` (or swap `src/lib/mailer.ts`) |
| Receiving mail as MX for your domain | ⚙️ Needs provider | Point an inbound provider at `POST /api/mail/messages` |

> **On "replacing Gmail":** this app is your encrypted mailbox and the brain that
> reads/writes it. To fully cut over from Google you also need a mail provider to
> handle SMTP send + MX receive for your domain (Resend, Postmark, SES, Mailgun).
> Send is a one-line hook (`src/lib/mailer.ts`); receive is a webhook that forwards
> inbound mail to `POST /api/mail/messages` with `direction: "inbound"`. Until then
> the mailbox is fully functional internally and via the API.

---

## Evolve Meet — AI video meetings (optional add-on)

A consent-first video meeting app for two or more participants, offered
alongside the calendar and email. Pages: `/meetings` (create/join) and
`/meetings/[id]` (the room).

- **Express-consent authorization screen.** Before anyone enters a room, a
  large, unmissable screen lets each participant opt **in or out** of each
  feature — recording, live transcription, AI summary, and receiving an emailed
  report. Everyone starts opted **out**; choices are stored per participant with
  a timestamp and IP as the legal record (`meeting_participants` consent
  columns). Media buttons in the room are disabled unless the matching consent
  was given.
- **Multi-participant video.** A WebRTC mesh (`src/lib/meeting-client.ts`)
  connects peers via the polling signaling API — works out of the box for small
  rooms. For large meetings, point the transport at a WebRTC SFU (LiveKit /
  mediasoup / Daily); the room UI only depends on the mesh callbacks.
- **Dictation** via the browser's speech recognition → transcript lines.
  **Recording** via MediaRecorder (consent-gated).
- **AI summary + permissioned reports.** `POST /api/meetings/[id]/summary`
  summarizes the transcript (overview, key points, decisions, action items) and
  emails the report **only to participants who gave express `reports` consent** —
  enforced server-side (verified: non-consenting recipients are skipped).
- **Screen share.** Any participant can share their screen (`getDisplayMedia`);
  the mesh live-swaps the outgoing video track and restores the camera on stop.
- **Shared work + per-revision approvals.** Participants share videos, images,
  slideshows, documents (large files via the same presigned direct-to-storage
  upload as mail attachments) **and links / URLs**. Under each asset is a notes
  box and three actions — **Approve**, **Request Revision**, **Not Approved** —
  recorded against that specific revision. Requesting a revision **requires the
  specific detail of the change** (enforced client + server), so the full
  approval history and every requested change is preserved (`asset_reviews`).

## CRM — pipelines, deals, lead capture

A built-in sales CRM (`/crm`). A default pipeline (New Lead → Contacted →
Qualified → Proposal → Won → Lost) is seeded on first use.

- **Kanban board** of deals by stage; moving a deal to a Won/Lost stage auto-sets
  its status. Open pipeline value totals at the top.
- **Lead capture** — `POST /api/crm/leads` is public (CORS-open) so any form or
  webinar can push leads in; the CRM shows the leads inbox and **converts a lead
  into a deal** in one click (`/api/crm/leads/[id]/convert`).

## Sell during a webinar — purchase pages

Create a product (`/products/manage`) and share its buy link. Drop the link in a
webinar chat and people purchase live.

- Public purchase page `/buy/[slug]` — supports `?src=<room-code>` so webinar
  sales are attributed (stored on the order's `sourceContext`).
- **Stripe when configured** (`STRIPE_SECRET_KEY`): `POST /api/checkout` creates
  a real Stripe Checkout Session and redirects the buyer; the signed webhook
  (`/api/checkout/webhook`, verified with `STRIPE_WEBHOOK_SECRET`) marks the
  order paid. Without a key, orders are recorded as pending (manual mode), so the
  flow works before payments are wired.

## Work-card scoring → production insights

Clients rate delivered work **1–10** (a `ScoreCard` widget on the meeting asset
cards and the client delivery review page). Scores (`work_scores`) roll up at
`/insights`:

- Overall average, average **by category** (worst first), and a recent-vs-prior
  **trend**.
- **AI-written recommendations** to improve production, focused on the
  lowest-scoring categories and any downtrend (heuristic fallback without a key).
  This is the loop that turns client ratings into better work.

## Client project delivery (Deliverables)

Package finished work and hand it to a client for sign-off. Pages: `/deliverables`
(create/manage) and the public `/deliver/[publicId]` (client review — no account
needed).

- **Build a package** (`deliverables` + `deliverable_items`): a Voice AI agent, a
  website, documents, videos, images, or links. File items upload direct-to-
  storage (any size); links and Voice-AI-agent items are just URLs.
- **Deliver** (`POST /api/deliverables/[id]/deliver`): marks it delivered and
  emails the client an unguessable review link.
- **Client decision** (`POST /api/deliverables/[id]/review`): the client either
  **Approves** or **Requests a Revision with specific detailed text** (required).
  The package status flips accordingly, and the decision is pushed into the team
  mailbox (revision requests land as high-priority, starred).

**Not included (integration points):** the production media plane (an SFU +
TURN servers) and native mobile "download" apps (ship the room as a PWA or wrap
with Capacitor / React Native). Everything else runs in the app today.

---

## Large attachments — documents & full-length video

The mailbox handles arbitrarily large attachments (multi-GB documents, full
length video) without the app server ever touching the bytes:

- **Direct-to-storage uploads.** The browser calls `POST /api/mail/attachments/
  init`, gets a presigned upload ticket, and uploads **straight to object
  storage** (S3 / R2 / B2 / MinIO). This bypasses the serverless request-body
  limit entirely — the size ceiling is the storage provider's (5 TB/object on
  S3), not the app's.
- **Chunked multipart for big files.** Files over 100 MB upload as parallel
  ~100 MB parts (resumable, progress-tracked in the compose UI); files at or
  under 100 MB use a single presigned PUT. The browser uploader slices the
  `File` so a full-length video is never loaded into memory.
- **Encrypted.** Blobs are encrypted at rest by the bucket's default encryption,
  and each file gets an envelope-wrapped per-file data key (`crypto.ts`) for
  optional client-side end-to-end encryption. Only metadata + the wrapped key
  live in the database; the bytes live in storage.
- **Time-limited downloads.** `GET /api/mail/attachments/[id]` returns a fresh
  presigned, expiring download URL — links are never public or permanent.
- **Self-healing tie-in.** Incomplete uploads older than 24h are detected (and
  marked failed) by the maintenance engine so abandoned multipart uploads don't
  accumulate storage cost.

**Endpoints:** `POST /api/mail/attachments/init`, `POST /api/mail/attachments/
[id]/complete`, `GET|DELETE /api/mail/attachments/[id]`. Send links them via
`attachmentIds` on `POST /api/mail/messages`.

**Bucket setup:** enable default encryption, and set a CORS policy allowing
`PUT` from your app origin with `ExposeHeaders: ["ETag"]` (multipart needs the
ETag readable from the browser).

---

## Birthday surprises

Signup asks for an optional birthday. A subscriber who provides one is stored in
`birthday_subscribers`, and the birthday mailer (`src/lib/birthday.ts`) emails
them a surprise on the day:

- Matches "today's" birthdays by month/day in `BIRTHDAY_TZ` (year-agnostic;
  Feb-29 birthdays are greeted Feb-28 in non-leap years).
- Sends **at most once per year** per subscriber (`lastGreetedYear` guard).
- The message is written fresh by Claude (sarcastic-but-warm, privacy-safe —
  it never implies we saw anything; it knows the date only because they told
  us), with a template fallback when the AI isn't configured.
- The surprise/offer line is set via `BIRTHDAY_SURPRISE`.
- Runs automatically on the daily maintenance cron; also
  `GET /api/birthday/run` (cron or agent auth) for manual/test runs.

---

## Self-maintaining: healing, optimizing, security

Both systems run a self-maintenance cycle that keeps them healthy, tunes them
from real usage, and continuously re-audits security. It runs automatically
(daily Vercel Cron → `/api/maintenance/cron`) and on demand
(`POST /api/maintenance?apply=true`). Every run is scored and stored; the
**System Health dashboard** at `/maintenance` shows the live state.

What each part actually does (honest scope — this is real maintenance
automation, not self-rewriting code):

- **Self-healing** (`src/lib/self-heal.ts`) — detects and repairs drift:
  past events still marked scheduled → completed; events missing a join link →
  backfilled; overdue reminders → cleared; DB connectivity checked; mailbox
  encryption integrity sampled (undecryptable rows flagged for a human); stuck
  outbound backlog surfaced. Safe fixes apply automatically; anything with a
  downside is flagged, not touched.
- **Self-optimizing** (`src/lib/optimizer.ts`) — learns from 60 days of history:
  cancellation rate, peak booking hour vs. current availability, autonomous-vs-
  manual mix, unread/high-priority mail, dominant mail category — and proposes
  concrete tuning (reminders, availability windows, auto-draft, saved views).
- **Security self-audit** (`src/lib/security-audit.ts`) — verifies config
  strength and fail-closed behavior, and scans the agent audit log for live
  attack signatures: **credential brute-forcing** (rejected-auth bursts) and
  **action floods**. Produces a 0–100 score and specific recommendations.
- **Regular threat updates** — automated in CI, independent of the app:
  `.github/dependabot.yml` opens weekly dependency-patch PRs, and
  `.github/workflows/security-audit.yml` runs `npm audit` on a schedule + every
  push (failing the build on high/critical CVEs). Hardened HTTP security headers
  (CSP, HSTS, X-Frame-Options, etc.) are applied to every route in
  `next.config.ts`.

**Endpoints:** `POST /api/maintenance?apply=true` (agent key or `CRON_SECRET`,
runs + applies safe fixes), `GET /api/maintenance` (report history for the
dashboard), `GET /api/maintenance/cron` (the scheduled entry point).

---

## Setup

1. **Install & configure**
   ```bash
   npm install
   cp .env.example .env.local   # then fill in the values
   ```
   Generate the encryption key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Run migrations** (creates the new tables in your Turso/libSQL db):
   ```bash
   node scripts/migrate.mjs
   ```

3. **Start the app**
   ```bash
   npm run dev
   ```
   - Calendar dashboard → `/calendar/dashboard`
   - Encrypted mailbox → `/mail`
   - System Health (self-heal/optimize/security) → `/maintenance`
   - Voice-agent API health → `GET /api/voice-agent`

---

## Voice-Agent API

One endpoint. Authenticated with your `VOICE_AGENT_API_KEY` via
`Authorization: Bearer <key>` (or `x-agent-key` header). Every response includes
a ready-to-speak `speech` string. Every call is written to the `voice_agent_log`
audit table.

```
POST /api/voice-agent
{ "action": "<action>", ...params, "callId": "...", "callerNumber": "..." }
```

### Actions

| Action | Params | Does |
|---|---|---|
| `check_availability` | `from?`, `to?`, `durationMinutes?` | Returns open slots + spoken summary |
| `book_meeting` | `text` **or** `startsAt`,`durationMinutes`,`title`,`attendees[]` | Conflict-checked booking |
| `reschedule_meeting` | `eventId`, `startsAt` | Moves a meeting |
| `cancel_meeting` | `eventId` | Cancels a meeting |
| `list_meetings` | `limit?` | Upcoming meetings |
| `next_meeting` | — | The very next meeting |
| `read_email` | `limit?` | Unread inbox summaries (spoken) |
| `get_email` | `messageId` | Full decrypted message (spoken) |
| `send_email` | `to[]`, `body` **or** `instruction`, `subject?` | Drafts/encrypts/sends |
| `draft_email` | `instruction` | Returns a draft without sending |
| `add_contact` | `name`, `email`, ... | Adds to the shared address book |
| `find_contact` | `query` | Looks up a contact |

**Example — book by voice:**
```bash
curl -X POST https://YOUR_APP/api/voice-agent \
  -H "Authorization: Bearer $VOICE_AGENT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"book_meeting","text":"30 minute demo with jordan@acme.com next Tuesday at 2pm","callId":"call_123"}'
```
Returns the booked event plus:
`"speech": "Done — I've booked ... A calendar invite and meeting link are set."`

### Wiring it to a voice platform
Register each action above as a tool/function on your voice provider (Vapi,
Retell, Bland, Twilio, Cartesia). Point the tool's webhook at `/api/voice-agent`,
set the `Authorization` header to your key, and read the `speech` field back to
the caller. That's the whole integration.

---

## REST API (for the dashboards / other integrations)

**Calendar**
- `GET/POST /api/calendar/events` — list / create (conflict-guarded)
- `GET/PATCH/DELETE /api/calendar/events/:id` — read / update / cancel
- `GET/POST /api/calendar/availability` — open slots / add availability rule
- `POST /api/calendar/schedule` — natural-language schedule (`{ text, book }`)

**Email**
- `GET/POST /api/mail/messages` — inbox list / ingest-or-send
- `GET/PATCH/DELETE /api/mail/messages/:id` — read (decrypt) / update / trash
- `POST /api/mail/compose` — AI draft (`{ instruction, replyToId? }`)
- `GET/POST /api/mail/contacts` — address book

**Agent**
- `GET /api/voice-agent` — capability manifest / health
- `GET /api/voice-agent/log` — autonomous-action audit trail

---

## Security notes

- **Encryption at rest:** subjects and bodies are encrypted with AES-256-GCM
  before touching the database. A DB dump reveals only ciphertext. The auth tag
  makes tampering detectable (`src/lib/crypto.ts`).
- **Agent auth:** the voice-agent endpoint fails closed — if no key is set, or a
  request lacks the correct bearer token, it is rejected and logged.
- **Audit trail:** every agent action (and every rejected attempt) is appended to
  `voice_agent_log` with params, result, call id, and caller number.
- **Confirmation step:** AI drafting (`/api/mail/compose`, `draft_email`) never
  sends on its own — a draft is returned for review, then explicitly sent.

## Architecture

```
Voice platform ──HTTPS(Bearer)──▶ /api/voice-agent ──┐
                                                      ├─▶ scheduling engine (src/lib/scheduling.ts)
Dashboard UIs ───fetch──▶ /api/calendar/* ────────────┤
                                                      ├─▶ AI engine (src/lib/ai.ts → Claude, w/ fallback)
Dashboard UIs ───fetch──▶ /api/mail/* ────────────────┤
                                                      ├─▶ crypto (src/lib/crypto.ts, AES-256-GCM)
Inbound mail webhook ──▶ /api/mail/messages ──────────┘
                                                      └─▶ libSQL / Turso (Drizzle ORM)
```

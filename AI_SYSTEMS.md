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
| Scheduling engine, availability, conflict checks | ✅ Working now | — |
| Voice-agent action API + audit log | ✅ Working now | Set `VOICE_AGENT_API_KEY` |
| Calendar + mailbox dashboards | ✅ Working now | — |
| AI parsing / triage / drafting | ✅ Works (heuristic) | Add `ANTHROPIC_API_KEY` for full intelligence |
| Actually sending mail over the internet | ⚙️ Needs provider | Set `RESEND_API_KEY` (or swap `src/lib/mailer.ts`) |
| Receiving mail as MX for your domain | ⚙️ Needs provider | Point an inbound provider at `POST /api/mail/messages` |

> **On "replacing Gmail":** this app is your encrypted mailbox and the brain that
> reads/writes it. To fully cut over from Google you also need a mail provider to
> handle SMTP send + MX receive for your domain (Resend, Postmark, SES, Mailgun).
> Send is a one-line hook (`src/lib/mailer.ts`); receive is a webhook that forwards
> inbound mail to `POST /api/mail/messages` with `direction: "inbound"`. Until then
> the mailbox is fully functional internally and via the API.

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

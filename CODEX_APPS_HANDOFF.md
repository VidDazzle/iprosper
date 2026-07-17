# Evolve — 3 Apps Handoff for Codex

This maps the three Evolve products to their exact files, routes, tables, env,
and integration points so they can be wired into Evolve. All three are modules
of **one Next.js 15 app** sharing a **Drizzle + libSQL/Turso** database and a
set of shared libraries — they are not three separate servers. Wire them into
the existing app (or a fresh Next.js app) by copying the listed files and
running the migrations.

## Downloadable bundles

| Bundle | Contents |
|---|---|
| `evolve-suite-full.zip` | The complete working source: all three apps + shared libs + billing/CRM + migrations + docs. **This is the authoritative code.** |
| `evolve-email.zip` | Email app files + shared libs + migrations + this README section. |
| `evolve-calendar.zip` | Calendar app files + shared libs + migrations. |
| `evolve-meet.zip` | Video meeting/webinar app files + shared libs + migrations. |

Each per-app zip is a coherent subset (includes the shared libraries it imports
and the full schema/migrations), so it builds in context. When wiring more than
one app into the same Evolve codebase, prefer `evolve-suite-full.zip` to avoid
duplicating shared files.

## Shared foundation (all three apps)

- `src/db/index.ts`, `src/db/schema.ts` — Drizzle client + schema (all tables).
- `src/lib/ai.ts` — Claude via `@anthropic-ai/sdk` (structured outputs) with a
  heuristic fallback. Powers parsing, triage, drafting, summaries.
- `src/lib/metering.ts`, `src/lib/pricing.ts` — usage metering + the profit
  guarantee (margin floor + hard caps). Costly actions call `meter()`.
- `scripts/migrate.mjs` — applies `drizzle/*.sql` (idempotent).
- Env: `TURSO_CONNECTION_URL`, `TURSO_AUTH_TOKEN`, `ANTHROPIC_API_KEY`
  (optional), `AI_MODEL` (default `claude-opus-4-8`), `MIN_MARGIN`.
- See `CODEX_HANDOFF.md` for the Anthropic wiring specifics.

Run migrations once: `node scripts/migrate.mjs`.

---

## 1) Evolve Mail (encrypted email)

**Routes** — `src/app/api/mail/*`
- `messages/route.ts` (GET inbox / POST send+ingest), `messages/[id]/route.ts`
  (read/decrypt, update, trash), `compose/route.ts` (AI draft),
  `contacts/route.ts`, `attachments/*` (presigned large-file upload),
  `inbound/route.ts` (**receive-side provider webhook**).
**UI** — `src/app/mail/page.tsx` (inbox/compose/read + uploader).
**Libs** — `crypto.ts` (AES-256-GCM at rest), `mailbox.ts`, `mailer.ts`
(outbound: Resend or manual), `storage.ts` + `upload-client.ts` (S3/R2/B2
attachments), `welcome.ts` (first-contact banner), `taglines.ts` (rotating
sign-offs), `ai.ts` (triage/draft/tagline).
**Tables** — `mail_messages`, `mail_contacts`, `mail_attachments`.
**Env** — `MAIL_ENCRYPTION_KEY` (required), `MAILBOX_ADDRESS`, `RESEND_API_KEY`
(send), `S3_*` (attachments), `MAIL_INBOUND_SECRET` (inbound webhook auth),
`WELCOME_MESSAGE`.
**Integration** — point your inbound email provider (Mailgun/SendGrid/Postmark/
Cloudflare Email) parse webhook at `POST /api/mail/inbound`; set `RESEND_API_KEY`
(or swap `mailer.ts`) for real send. Metered as `email`.

## 2) Evolve Calendar

**Routes** — `src/app/api/calendar/*`
- `events/route.ts` (list/create, conflict-guarded), `events/[id]/route.ts`
  (read/update/cancel), `events/[id]/ics/route.ts` (**.ics download**),
  `ics/route.ts` (**subscribable feed**), `availability/route.ts` (free slots +
  rules), `schedule/route.ts` (**AI natural-language booking**),
  `reminders/run/route.ts` (**reminder dispatch**).
**UI** — `src/app/calendar/dashboard/page.tsx`.
**Libs** — `scheduling.ts` (timezone-aware slots/conflicts), `reminders.ts`
(email reminders), `ics.ts` (iCalendar), `ai.ts` (`parseSchedulingRequest`),
`mailbox.ts`/`mailer.ts` (reminder emails).
**Tables** — `calendar_events`, `availability_rules`.
**Env** — shared only; reminders reuse the mail sender.
**Integration** — the voice agent books via `/api/calendar/schedule`; the daily
maintenance cron dispatches reminders (point an hourly cron at
`/api/calendar/reminders/run` for tighter timing). Metered as `calendar`.

## 3) Evolve Meet (video meeting + webinar)

**Routes** — `src/app/api/meetings/*`
- `route.ts` (create/list), `[id]/route.ts` (state/PATCH incl. pinned CTA),
  `[id]/join`, `[id]/consent` (**express-consent authorization**),
  `[id]/assets` + `[id]/assets/[assetId]/complete` + `.../reviews`
  (share files/links + **Approve / Request-Revision(w/ required detail) /
  Not-Approved** per revision), `[id]/transcript` (dictation),
  `[id]/summary` (**AI summary + permissioned reports**), `[id]/signal`
  (WebRTC signaling), `[id]/register` (**public webinar registration → CRM
  lead**).
**UI** — `src/app/meetings/page.tsx` (create/join), `src/app/meetings/[id]/page.tsx`
(consent gate, video mesh, screen share, dictation, recording, asset review,
pinned buy-CTA). Component `src/components/ScoreCard.tsx` (1–10 work-card score).
**Libs** — `meetings.ts`, `meeting-client.ts` (WebRTC mesh + chunked uploader),
`scheduling.ts` (shared), `storage.ts` (shared), `ai.ts` (`summarizeMeeting`).
**Tables** — `meetings`, `meeting_participants`, `meeting_assets`,
`asset_reviews`, `meeting_transcript_lines`, `meeting_artifacts`,
`meeting_signals`.
**Env** — `S3_*` (shared assets), `MAIL_ENCRYPTION_KEY` (stored reports).
**Integration / production notes**
- Multi-party video is a **browser WebRTC mesh** over polling signaling — fine
  for small rooms. For webinars at scale, swap the transport for a WebRTC SFU
  (LiveKit / mediasoup / Daily); the room UI depends only on the
  `MeetingMesh` callbacks, so the swap is localized.
- Webinar registration captures leads into the CRM (`leads`, source `webinar`);
  the host can pin a buy CTA (`pinnedCtaUrl`/`pinnedCtaLabel`) shown in-room so
  attendees purchase live via the `/buy/[slug]` pages. Metered as `meet`.

---

## Cross-app systems already wired (in the full bundle)

Billing/metering + usage bar (`/plans`, `UsageMeter`), CRM (`/crm`) + lead
follow-ups, commerce (`/buy`, `/products/manage`), work-card scoring →
`/insights`, birthday automation, self-healing maintenance (`/maintenance`),
and the installable PWA. These live in `evolve-suite-full.zip`; see
`AI_SYSTEMS.md` for the full reference.

## Build & run
```
npm install
cp .env.example .env.local   # fill in keys
node scripts/migrate.mjs
npm run dev
```

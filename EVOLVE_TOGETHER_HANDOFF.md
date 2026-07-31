# Evolve Together — two-person connection (handoff for Codex)

Two people at separate locations link their Evolve Life profiles to share
calendars + location, find when they're **both** free, plan a date (dinner,
a weekend at a hotel, etc.) with a **propose → accept / decline / counter** loop
that lands on both calendars only once **both have agreed**, and share **private
photos** that stay locked until revealed — gated behind **identity
verification**.

## Important: the identity check

The request mentioned an "OpenAI identity check." **OpenAI does not provide
identity or biometric verification**, so this is wired to a real **KYC provider**
(Stripe Identity by default; Persona / Onfido / Veriff are drop-in). The
provider performs the **driver's-license scan + selfie face-match**. We
deliberately **never receive or store the ID image or biometric template** — the
provider returns only a pass/fail, and that status is all we persist
(`identity_verifications`). Uploading a photo is blocked (HTTP 403
`identity_required`) until the person is `verified`.

## What's built (verified end-to-end)

- **Connect**: invite by email → the other person accepts → active connection.
- **Shared view** (`/api/together/overview`): partner card (name, city, and live
  location **only if both have location sharing on**), each person's schedule for
  the day, and mutual free slots (both calendars merged) for date planning.
- **Location**: `PUT /api/together/location` updates your position (opt-in;
  the `/together` page calls it from `navigator.geolocation`).
- **Date proposals**: propose → the *other* party accepts / declines / counters;
  a counter creates a child proposal; on accept the date is written to **both**
  calendars (`❤️ …`). Verified: self-accept is blocked; counter→accept confirms.
- **Private photos**: upload requires verification; each photo starts **locked**;
  the partner can **ask to see it**; the owner **reveals** (or hides). Stored via
  the encrypted object store (or a direct URL).

## Files

| Area | Path |
|---|---|
| Schema | `src/db/schema.ts` (connections, dateProposals, identityVerifications, sharedPhotos; + `owner_profile_id` on calendar_events; + presence cols on life_profiles) · migration `drizzle/0011_together.sql` |
| Identity | `src/lib/identity.ts` — KYC adapter (Stripe Identity + webhook parse) |
| Helpers | `src/lib/together.ts` — connection resolution, daily schedule, mutual free slots, verification check, partner card |
| API | `src/app/api/together/{connection,overview,location,proposals}/route.ts`, `identity/{start,status,webhook}/route.ts`, `photos/route.ts`, `photos/[id]/route.ts` |
| UI | `src/app/together/page.tsx` (in the PWA) |

## API quick reference

- `GET/POST/PATCH /api/together/connection` — invite / accept / decline / pause; toggle share flags.
- `GET /api/together/overview?day=ISO` — partner card + both schedules + mutual slots + my verified status.
- `PUT /api/together/location` — update my location `{ lat, lng, shareLocation }`.
- `GET/POST/PATCH /api/together/proposals` — list / propose / respond (`accept|decline|counter`).
- `POST /api/together/identity/start` · `GET …/status` · `POST …/webhook` — KYC.
- `GET/POST /api/together/photos` · `PATCH /api/together/photos/[id]` (`reveal|hide|request`).

## What Codex wires

| Capability | Env / action |
|---|---|
| Real license + face-match | `STRIPE_SECRET_KEY` (Stripe Identity) + `STRIPE_IDENTITY_WEBHOOK_SECRET`; or swap `identity.ts` for Persona/Onfido/Veriff |
| Photo storage (images/video) | `S3_*` (already used by mail attachments) — else pass a direct `url` |
| Live location | the page uses `navigator.geolocation`; add a background updater / map tiles if you want a live map |
| Accounts | today profiles resolve by email (`?email=` / body `email`) — the `/together` page has an "acting as" switcher for testing. Replace with your real auth so each person is their own logged-in user. |

## Safety notes (by design)

- Everything is **mutual opt-in**: connection requires acceptance; location and
  calendar sharing are per-connection toggles; photos are consent-gated both ways.
- **No ID documents or biometrics are stored** — only the provider's pass/fail.
- Identity verification exists to reduce catfishing/impersonation before intimate
  photo sharing; keep the provider in production (don't ship sandbox mode).

## Build & run
```
node scripts/migrate.mjs   # applies 0011_together.sql (idempotent)
npm run dev                # /together is live
```

# Codex Handoff — Continuous Deployment & Auto-Updates

**Goal:** when a change is merged, the host builds and publishes it, and **every
user is moved onto the new version automatically** — no manual reinstall, no
"hard refresh" instructions.

The client half of this is **already built and verified** (PWA auto-update — see
`## What's already done`). Your job is the deployment half: wire the host so a
merge to the production branch actually ships a new build, and so database
migrations run on each deploy. It's mostly dashboard config — little to no code.

## TL;DR

1. **Connect the repo to Vercel** with Git auto-deploy. Set the **Production
   Branch** to your default branch (e.g. `main`). Every push/merge to it then
   builds and promotes automatically.
2. **Set the production env vars** in Vercel → Project → Settings → Environment
   Variables (see the table below and `.env.example`). At minimum:
   `TURSO_CONNECTION_URL`, `TURSO_AUTH_TOKEN`, `MAIL_ENCRYPTION_KEY`,
   `ANTHROPIC_API_KEY`, `CRON_SECRET`.
3. **Run migrations on deploy** so schema changes ship with the code. Set the
   Vercel **Build Command** to:
   ```
   npm run migrate && next build
   ```
   (`npm run migrate` → `node scripts/migrate.mjs`; it's idempotent and reads
   `TURSO_CONNECTION_URL` / `TURSO_AUTH_TOKEN` from the build env.)
4. Push once and confirm a deployment appears. Done — from here, merge →
   auto-build → every client auto-updates.

Everything below is detail.

## What's already done (client side — do not rebuild)

The app is an installable PWA, and the service worker now pushes new versions to
open/installed clients automatically:

- `public/sw.js` — navigations are **network-first** (pages are always fresh
  online); the new worker **waits** on install and activates on a `SKIP_WAITING`
  message from the page for a clean handoff. Cache is versioned (`evolve-v2`).
- `src/components/PwaRegister.tsx` — **polls for a new deploy hourly and on tab
  focus**, tells a freshly-installed worker to activate, and **reloads open
  clients onto the new version** via `controllerchange`. Guarded so it never
  loops on first install and never reloads while someone is typing (it defers to
  field blur / tab hide).

Verified in a real browser: first install activates with no reload loop; repeat
visits are controlled and pick up updates. **You don't need to touch this** — it
just needs real builds to be deployed, which is the rest of this doc.

## The deploy pipeline, end to end

```
merge to main
   → Vercel Git integration triggers a build
   → Build Command: npm run migrate && next build   (schema + code ship together)
   → Vercel promotes the new deployment to production
   → within ≤1h (or on next tab focus) each client's service worker sees the new
     build, activates it, and reloads the user onto it — automatically
```

## Configuration (Vercel → Settings → Environment Variables)

Set these for the **Production** (and ideally **Preview**) environments. Full
list and comments live in `.env.example`; the deploy-critical ones:

| Variable | Required | Purpose |
|---|---|---|
| `TURSO_CONNECTION_URL` | **Yes** | libSQL/Turso database URL. Used at build (migrations) and runtime. |
| `TURSO_AUTH_TOKEN` | **Yes** (remote Turso) | Auth for the Turso DB. |
| `MAIL_ENCRYPTION_KEY` | **Yes** | Encryption at rest (mail bodies + OAuth calendar tokens). 64-hex; generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
| `ANTHROPIC_API_KEY` | To enable AI | Turns on real Claude (see `CODEX_HANDOFF.md`). |
| `CRON_SECRET` | **Yes** | Vercel Cron sends it as `Authorization: Bearer <CRON_SECRET>`; also gates the credit-grant admin route. |
| Google/Microsoft OAuth, Stripe, Twilio, VAPID, KYC, screening, `MODERATION_SECRET` | Optional | Per-feature; each is gated with a graceful fallback (`.env.example`). |

> Migrations run at **build** time, so `TURSO_CONNECTION_URL` (and
> `TURSO_AUTH_TOKEN` for remote Turso) must be present in the **Build**
> environment, not only at runtime. If the build env has no Turso URL,
> `scripts/migrate.mjs` falls back to a throwaway local file and prod schema is
> **not** updated — so make sure it's set.

## Migrations

- Raw SQL lives in `drizzle/` and is applied by `scripts/migrate.mjs`
  (idempotent — it records applied files and skips them next time).
- Run locally against prod before wiring the build step if you want to verify:
  `TURSO_CONNECTION_URL=... TURSO_AUTH_TOKEN=... npm run migrate`.
- Putting `npm run migrate` ahead of `next build` (step 3 above) means a merge
  that adds a migration applies it on the same deploy — so schema changes reach
  users together with the code that needs them.

## Production branch & this handoff branch

Development happened on `claude/ai-calendar-email-system-u8cagi`. To go live:

1. Open a PR from that branch into your default branch and merge it.
2. In Vercel, set **Production Branch = your default branch**. From then on,
   each merge auto-deploys to production; other branches get preview URLs.

## Cron (already declared)

`vercel.json` already schedules the daily maintenance job:
```json
"crons": [{ "path": "/api/maintenance/cron", "schedule": "0 6 * * *" }]
```
Just ensure `CRON_SECRET` is set so the endpoint accepts the scheduled call.

## Verify it's live

1. Make a trivial visible change (e.g. a word on `/orbit-os`), merge to main.
2. Watch the Vercel deployment go green; confirm the migration step ran in the
   build logs.
3. Open the app in a browser tab, leave it open, and within the hour (or switch
   away and back to force an update check) confirm it reloads onto the new
   version on its own. Installed PWA instances behave the same.

## Rollback

Use Vercel's **Instant Rollback** (Deployments → pick a previous green deploy →
Promote). Clients auto-update **to** that promoted version the same way. Note
that a rollback does **not** revert database migrations — write migrations to be
backward-compatible (add columns/tables; avoid destructive drops in the same
deploy as the code that depends on them).

## Optional hardening

- **GitHub Actions build check**: add a workflow that runs `npm ci`,
  `npx tsc --noEmit`, and `next build` on PRs so a broken build can't reach the
  production branch. (`.github/workflows/security-audit.yml` already exists as a
  pattern to copy.)
- **Preview env vars**: point Preview deployments at a separate Turso database so
  preview migrations never touch production data.

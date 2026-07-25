# ViralHive

An installable, autonomous social video app — one agent per connected
account, a self-optimizing content pipeline, and a real dashboard (no YAML
editing) at `/viralhive`. This Next.js app **is** ViralHive: the dashboard
you configure it from, and the engine that runs it, in one deployable app.

## What's here vs. the standalone CLI

The `viralhive/` subdirectory is a separate, self-contained npm package with
the same engine, usable on its own as a CLI daemon or MCP server (see its
README) — useful if you'd rather self-host on a VPS with YAML config. This
Next.js app is the **hosted app** experience: it reuses that engine's
stateless business logic (creative pipeline, quality gate, platform agents)
but stores config and state in a database instead of local files, so it
runs as an installable web/PWA app with no server to manage yourself.

## Setup

1. **Database** — create a free [Turso](https://turso.tech) database, or
   point `TURSO_CONNECTION_URL` at a local file (`file:./data/dev.db`) for
   local development.
2. Copy `.env.example` to `.env.local` and fill in every value (generate the
   `VIRALHIVE_*` secrets with `openssl rand -base64 32`).
3. Apply the database schema: `npm run db:generate && npm run db:migrate`
   (or, for a local file DB, see `viralhive/docs` — any tool that can run
   the SQL files under `drizzle/` against your DB works).
4. `npm install && npm run dev`, then open `/viralhive/login`.
5. In the dashboard: add at least one AI provider (Providers page, e.g. an
   OpenAI or Anthropic key + a Higgsfield key for video), one social account,
   optionally a product, then a campaign tying them together.

## Deploying so it's truly autonomous

Deploy to Vercel and set the same environment variables there (plus
`CRON_SECRET` — Vercel automatically authenticates its own Cron Jobs with
it). `vercel.json` already declares an hourly cron hitting
`/api/viralhive/cron`, which posts any due autopilot campaigns, collects
engagement metrics, and answers prospect comments — all without the
dashboard needing to be open or any device staying on. Vercel's Hobby plan
only allows daily cron jobs; Pro (or a self-hosted alternative pinging that
same URL hourly) is needed for the hourly cadence configured here.

## Security notes

- Every social account token, provider API key, and the Stripe key are
  encrypted at rest (AES-256-GCM) using `VIRALHIVE_ENCRYPTION_KEY` — losing
  that key means re-entering all credentials, there's no recovery.
- The dashboard is gated by a single admin password
  (`VIRALHIVE_ADMIN_PASSWORD`) — this is a personal single-operator tool,
  not multi-tenant; don't share the login.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

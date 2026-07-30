# ProsperPilot — Social Prospecting Pipeline

A compliant, autonomous prospecting copilot. It finds people publicly expressing
a need across social platforms and blogs/forums, scores their buying intent,
matches a product/affiliate offer, optimizes toward what actually sells, and
drafts an outreach message that a human approves before anything is sent.

## What it does — and deliberately does not do

**Does**
- Reads **public** posts/comments (and mentions on your own assets) through each
  platform's **official API**.
- Boolean keyword pre-filter → LLM intent classifier (buying intent, urgency,
  pain point, sentiment, budget).
- De-duplicated, scored prospect queue with cooldowns and jurisdiction flags.
- Product matching across dropship suppliers (Alibaba, CJ, AliExpress) and
  affiliate networks (Amazon Associates, ShareASale, Impact, ClickBank) plus
  your own catalog, ranked by relevance, margin, ship time, and reviews.
- AI-drafted replies with **enforced FTC affiliate + bot disclosure**, sent from
  **your own accounts** through official endpoints, after a **human review**.
- Self-optimizing feedback loop (A/B template outcomes, conversion tracking),
  global suppression/opt-out list, and an append-only audit log.
- **Autonomous performance optimizer** (`optimizer.ts`): rescores products from
  real sales/click data, auto-pauses chronic non-sellers, reactivates recovering
  ones, and biases the matcher toward proven winners via `priorityScore`.
- **Opportunity finder** (`opportunityFinder.ts`): evaluates affiliate programs
  and business/money-making opportunities, returning a rationale, revenue
  estimate, effort level, and 0–100 score. Flags MLM/get-rich-quick red flags.
- **Print-on-demand studio** (`pod.ts`): puts an operator image onto physical
  products (tees, mugs, etc.) via a POD provider (Printful wired; Printify/Gooten
  pluggable); successful items become promotable products automatically.
- **Web/RSS listening** (`connectors/rss.ts`): a listen-only `web` source that
  reads public RSS/Atom feeds from blogs, forums, and Q&A sites.
- **Operator assistant** (`assistant.ts`): a conversational agent *for you* — ask
  it about your products, metrics, and which opportunities to pursue. One
  endpoint backs text now and voice/email adapters. It identifies as AI.

**Enrollment is human-authorized.** The opportunity finder never signs you up
for anything on its own; you move an opportunity to `enrolled` yourself.

**Does not**
- No scraping, no reading private DMs, no evading platform bot detection, no
  impersonating a human. Outreach is disclosed and rate-limited. Where a
  platform's terms forbid automated outreach (Instagram/TikTok/LinkedIn by
  default here), the pipeline refuses to send rather than working around it.

## Architecture

```
connectors/*  ─ official-API read + send per platform
termMatch.ts  ─ cheap boolean pre-filter
classifier.ts ─ LLM (or heuristic fallback) intent scoring
scoring.ts    ─ lead score + product matching
messageGenerator.ts ─ draft + disclosure injection
compliance.ts ─ per-platform policy, disclosure, jurisdiction, gates
pipeline.ts   ─ orchestration: ingest → classify → draft (never sends)
```

API routes live under `src/app/api/prospecting/*`; the operator dashboard is at
`/prospecting`.

## Configuration (env)

| Var | Purpose |
| --- | --- |
| `TURSO_CONNECTION_URL`, `TURSO_AUTH_TOKEN` | Database |
| `ANTHROPIC_API_KEY` | Enables LLM intent classification (heuristic fallback otherwise) |
| `X_BEARER_TOKEN` | X/Twitter search |
| `X_ACCESS_TOKEN`, `X_ACCESS_SECRET` | X posting (user context) |
| `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_USER_AGENT` | Reddit search |
| `REDDIT_ACCESS_TOKEN` | Reddit posting (user context) |
| `RSS_FEED_URLS` | Comma-separated public RSS/Atom feeds for the `web` source |
| `PRINTFUL_API_KEY` / `PRINTIFY_API_KEY` / `GOOTEN_API_KEY` | Print-on-demand providers |
| `CRON_SECRET` | Bearer token the scheduled cadence requires (Vercel Cron sends it automatically) |

## Scheduled cadence

`vercel.json` defines two Vercel Cron jobs hitting `GET /api/prospecting/cron`:

| Job | Schedule (UTC) | What it does |
| --- | --- | --- |
| `?job=listen` | every 6 hours (`0 */6 * * *`) | ingest → classify → draft for every configured connector |
| `?job=optimize` | daily 09:00 (`0 9 * * *`) | run the autonomous performance optimizer |

The endpoint is auth-gated by `CRON_SECRET`; Vercel Cron attaches
`Authorization: Bearer $CRON_SECRET` automatically when the env var is set.
Drafting never sends — the human review queue still gates all outreach — so the
cadence keeps the funnel full and the catalog optimized without any message
going out unattended. You can also trigger it manually:
`curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/prospecting/cron?job=all`.

Note: Vercel Cron frequency depends on your plan (Hobby is limited to daily);
adjust the schedules to fit. The jobs are idempotent and safe to run more often.

Connectors are only active when their credentials are present; otherwise the
dashboard shows them as "no credentials" and they are skipped.

## Compliance notes

The per-platform policy table in `compliance.ts` encodes conservative defaults,
**not legal advice**. Keep it in sync with each platform's current developer
terms and your local marketing law (GDPR/CCPA, CAN-SPAM, TCPA). Honor opt-outs
immediately via the suppression list. Crisis-sentiment posts are never marketed
to.

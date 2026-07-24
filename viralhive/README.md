# ViralHive

An autonomous, self-optimizing, multi-account social video agent swarm. One
agent per social account; a shared creative pipeline (idea → script → video →
quality gate → SEO → commerce → post) feeds them all, and a learning loop
tunes timing and content strategy from real engagement data over time. Runs
as a background daemon (no human approval step) or as an MCP server you can
talk to from Claude or any MCP-compatible client.

## What it does

1. **Ideation** — an LLM proposes trend-aware video ideas for your niche,
   biased toward whatever has actually driven engagement historically (see
   "Self-improving," below).
2. **Scriptwriting + SEO** — hook, script, caption, hashtags, and
   keyword-optimized title/description/alt-text are generated together in
   one pass so they stay coherent (`src/creative/scriptWriter.ts`,
   `src/seo/seo.ts`).
3. **Rendering** — the script is turned into a real video via a pluggable
   video provider (ships with a Higgsfield integration; Leonardo.ai wired in
   for image generation; add any other API by implementing one interface).
   If the campaign has a product attached, its reference image and a natural
   on-screen placement get folded into the render.
4. **Quality gate** — an LLM critic scores the result on hook strength,
   pacing, visual/audio quality, trend alignment, and caption quality; an
   optional virality predictor adds a data-driven score; an automated policy
   check screens for platform-ToS and safety violations. Anything under the
   configured threshold (default 9.2/10) is **regenerated**, not shipped —
   this is the "always 10/10" bar, enforced automatically, with no human in
   the loop.
5. **Commerce** — if the campaign has a `productId`, a real Stripe Checkout
   link (or a UTM-tagged fallback URL) is generated per content item and
   appended as a CTA before posting (`src/commerce/`).
6. **Distribution** — one platform agent per connected account posts the
   approved video: TikTok, Instagram Reels, Facebook, YouTube Shorts, X,
   LinkedIn, Pinterest, plus a generic webhook agent for anything else
   (Threads, Snapchat, an internal CMS — bridge it via Zapier/Make/n8n).
7. **Prospect engagement** — polls comments on recent posts every 15 minutes
   and answers genuine questions/purchase intent on-brand, while ignoring
   spam and noise (`src/engagement/engagementAgent.ts`). Every drafted reply
   passes through the same policy filter as posted content before it ships.
8. **Analytics + self-improvement** — pulls views/likes/comments/shares/
   clicks/new-followers for recent posts every 2 hours, scores each post's
   engagement rate, and feeds two loops: which posting hours actually work
   per account (used by the scheduler), and which past topics/hooks actually
   resonated (used to bias new ideation). See "Self-improving" below for
   exactly what this does and doesn't mean.
9. **Self-healing** — LLM and video providers can be configured as a
   priority-ordered fallback chain; if the primary is down or rate-limited,
   the next one takes over automatically and the run keeps going
   (`src/core/failover.ts`).

## Quick start

```bash
cd viralhive
npm install
cp .env.example .env            # fill in your API keys and account tokens
cp accounts.example.yaml accounts.yaml   # describe your accounts, campaigns, products

# One-off: run a single campaign cycle right now and see what happens
npm run cli -- run daily_fitness_shorts

# Check status / recent posts
npm run cli -- status

# Fully autonomous: start the daemon and walk away
npm run dev:daemon                # dev, via tsx
# or, after `npm run build`:
npm run start:daemon
```

## Running it as an MCP server instead

```bash
npm run dev:mcp      # dev, via tsx
# or, after `npm run build`:
npm run start:mcp
```

Point any MCP client (Claude Desktop, Claude Code, a custom app) at this
process over stdio. Available tools: `list_accounts`, `list_campaigns`,
`run_campaign_now`, `start_autopilot`, `stop_autopilot`, `get_recent_posts`,
`get_recent_content`, `get_run_log`, `get_learning_insights`,
`list_products`. The scheduler keeps running in-process even while the MCP
client is idle, so autopilot campaigns don't pause between conversations.

Note: the MCP tools are for *checking in and steering*, not a gate content
must pass through — `run_campaign_now` and the autonomous scheduler both
call the exact same `Orchestrator.runCampaignOnce`, so nothing behaves
differently just because a human happened to trigger it.

## Configuring accounts, campaigns, and products

Everything lives in `accounts.yaml` (copy from `accounts.example.yaml`).
Secrets are never written there — only the *names* of environment variables
that hold them, resolved from `.env` at startup.

- **Accounts** — `platform`, `credentials` (logical name → env var name),
  `postsPerDay`/`postingWindow`/`timezone` (the scheduler enforces the daily
  cap even if over-configured).
- **Campaigns** — niche/goal/tone plus `qualityThreshold`,
  `maxRegenerationAttempts`, `autopilot`, `smartScheduling` (see below),
  `engagementAutoReply`, and an optional `productId` to make it shoppable.
- **Products** — name/description/price/images/`stripePriceId`. Create the
  Stripe Price once in your dashboard; ViralHive only creates the per-post
  Checkout Session.

## Self-improving, in concrete terms

"Self-improving" here means two specific, inspectable feedback loops built
on real engagement data — not an opaque black box:

- **Timing**: `src/core/state.ts` keeps a running per-account, per-hour
  engagement average from every collected metrics snapshot. Once an hour has
  at least 3 samples, campaigns with `smartScheduling: true` start posting
  at the best-scoring hours instead of the static `postingWindow`,
  recomputed nightly. Until there's enough data, it uses your configured
  window — it never guesses.
- **Content**: the highest-scoring past topics/hooks for a campaign are fed
  back into the ideation prompt (`topPerformers` in
  `src/creative/scriptWriter.ts`) so new ideas lean into proven territory
  without repeating verbatim.

Both are heuristic and transparent, not a trained model — inspect them
anytime via the `get_learning_insights` MCP tool or `SELECT * FROM
timing_stats` / `content_items` in the SQLite DB.

## Any AI platform, any LLM, any API key

Creative backends are config, not code. `providerRegistry` entries declare a
`kind` (`llm-openai-compatible`, `llm-anthropic`, `higgsfield`, `leonardo`,
`elevenlabs`), a `baseUrl`, a `model`, and which env var holds the key.
`llm-openai-compatible` works against OpenAI, Groq, Together, Fireworks, or
a local Ollama instance's OpenAI-compatible route — point `baseUrl` at it.
`providers.script`/`video`/etc. accept either a single id or an array —
arrays become an automatic failover chain (`src/core/failover.ts`), and
bumping to a newer model release is a one-line `model:` change, no code
touched. To add a provider type outright, implement the relevant interface
in `src/creative/types.ts` and register it in
`src/creative/providerFactory.ts`.

## Adding a platform

Implement `SocialPlatformAgent` (`src/platforms/types.ts`) and register it
in `src/platforms/registry.ts`. Every existing agent (`tiktokAgent.ts`,
`instagramAgent.ts`, etc.) is a self-contained reference implementation
against that platform's real public API — same shape, different HTTP calls.
`fetchRecentComments`/`replyToComment`/`fetchMetrics` are optional; implement
them to plug a platform into the engagement and analytics loops too.

## Deploying so it truly runs without you

See [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) for phone (Termux),
desktop (PM2/systemd), Docker, and cloud VPS options, plus the honest
tradeoffs between them (a phone that sleeps will not post at 6am).

## Architecture

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for the full data flow
and module map.

## Guardrails that stay on even in autonomous mode

"No approval" means no *human* gate — it does not mean no safety gate. The
quality/policy check in `src/quality/policyFilter.ts` runs on every single
piece of content and every auto-drafted comment reply, autonomous or manual,
and blocks anything that would get your accounts banned or cause real harm
(hate speech, sexual content involving minors, dangerous misinformation,
etc.) before it's ever posted. Tune `bannedTopics` per campaign; the
hard-coded checks are not configurable by design.

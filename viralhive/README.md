# iProsper Social Agent

An autonomous, multi-account social video agent swarm. One agent per social
account; a shared creative pipeline (script → video → quality gate) feeds
them all. Runs as a background daemon (no human approval step) or as an MCP
server you can talk to from Claude or any MCP-compatible client.

## What it does

1. **Ideation** — an LLM proposes trend-aware video ideas for your niche.
2. **Scriptwriting** — hook, script, caption, and hashtags are generated for
   the idea.
3. **Rendering** — the script is turned into a real video via a pluggable
   video provider (ships with a Higgsfield integration; Leonardo.ai wired in
   for image generation; add any other API by implementing one interface).
4. **Quality gate** — an LLM critic scores the result on hook strength,
   pacing, visual/audio quality, trend alignment, and caption quality; an
   optional virality predictor adds a data-driven score; an automated policy
   check screens for platform-ToS and safety violations. Anything under the
   configured threshold (default 9.2/10) is **regenerated**, not shipped —
   this is the "always 10/10" bar, enforced automatically, with no human in
   the loop.
5. **Distribution** — one platform agent per connected account posts the
   approved video: TikTok, Instagram Reels, Facebook, YouTube Shorts, X,
   LinkedIn, Pinterest, plus a generic webhook agent for anything else
   (Threads, Snapchat, an internal CMS — bridge it via Zapier/Make/n8n).
6. **Scheduling** — a cron-based scheduler fires each campaign at every
   account's configured posting-window times, forever, unattended.

## Quick start

```bash
cd social-agent
npm install
cp .env.example .env            # fill in your API keys and account tokens
cp accounts.example.yaml accounts.yaml   # describe your accounts & campaigns

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
`get_recent_content`, `get_run_log`. The scheduler keeps running in-process
even while the MCP client is idle, so autopilot campaigns don't pause
between conversations.

Note: the MCP tools are for *checking in and steering*, not a gate content
must pass through — `run_campaign_now` and the autonomous scheduler both
call the exact same `Orchestrator.runCampaignOnce`, so nothing behaves
differently just because a human happened to trigger it.

## Configuring accounts & campaigns

Everything lives in `accounts.yaml` (copy from `accounts.example.yaml`).
Secrets are never written there — only the *names* of environment variables
that hold them, resolved from `.env` at startup. Each account declares:

- `platform` — which built-in agent to use (`tiktok`, `instagram`,
  `facebook`, `youtube`, `x`, `linkedin`, `pinterest`, or `webhook` for
  anything without a native integration yet).
- `credentials` — a map of logical name → env var name (e.g.
  `accessToken: TIKTOK_MAIN_ACCESS_TOKEN`).
- `postsPerDay` / `postingWindow` / `timezone` — how often and when it
  posts; the scheduler enforces the daily cap even if a campaign is
  configured to over-post.

Campaigns tie a niche/goal/tone to one or more accounts and set the quality
bar (`qualityThreshold`, `maxRegenerationAttempts`) and whether they start
in `autopilot: true` (fully unattended) or need `start_autopilot` called
explicitly.

## Any AI platform, any LLM, any API key

Creative backends are config, not code. `providerRegistry` entries declare a
`kind` (`llm-openai-compatible`, `llm-anthropic`, `higgsfield`, `leonardo`,
`elevenlabs`), a `baseUrl`, a `model`, and which env var holds the key.
`llm-openai-compatible` works against OpenAI, Groq, Together, Fireworks, or
a local Ollama instance's OpenAI-compatible route — point `baseUrl` at it.
To add a provider type outright (a new video/image/LLM/voice backend),
implement the relevant interface in `src/creative/types.ts` and register it
in `src/creative/providerFactory.ts`; nothing else in the pipeline needs to
change.

## Adding a platform

Implement `SocialPlatformAgent` (`src/platforms/types.ts`) and register it
in `src/platforms/registry.ts`. Every existing agent (`tiktokAgent.ts`,
`instagramAgent.ts`, etc.) is a self-contained reference implementation
against that platform's real public API — same shape, different HTTP calls.

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
piece of content, autonomous or manual, and blocks anything that would get
your accounts banned or cause real harm (hate speech, sexual content
involving minors, dangerous misinformation, etc.) before it's ever posted.
Tune `bannedTopics` per campaign; the hard-coded checks are not
configurable by design.

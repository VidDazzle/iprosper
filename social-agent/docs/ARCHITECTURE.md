# Architecture

```
config/accounts.yaml + .env
            │
            ▼
   ┌─────────────────┐
   │  Orchestrator    │  owns AppConfig + StateStore (SQLite)
   └────────┬─────────┘
            │ runCampaignOnce(campaignId)
            ▼
   ┌─────────────────┐      ┌────────────────────┐
   │  TrendSource     │─────▶│  scriptWriter        │  idea -> hook/script/caption/hashtags
   └─────────────────┘      └──────────┬──────────┘
                                        ▼
                              ┌────────────────────┐
                              │  VideoPipeline       │  script -> rendered video (Higgsfield/etc.)
                              └──────────┬──────────┘
                                        ▼
                              ┌────────────────────┐
                              │  QualityGate         │  scores + policy check; regenerates
                              │  (loop until >=      │  until threshold met or attempts
                              │   threshold)          │  exhausted
                              └──────────┬──────────┘
                                        ▼ (only if passed)
                     ┌──────────────────┼──────────────────┐
                     ▼                  ▼                  ▼
              TikTokAgent        InstagramAgent       ...one SocialPlatformAgent
              (account A)         (account B)          per configured account
                     │                  │                  │
                     ▼                  ▼                  ▼
                 posts to           posts to            posts to
                 TikTok API         Meta Graph API       ...
```

## Module map

- `config/` — YAML+env config loading and validation (zod), shared types.
- `core/` — `Orchestrator` (the single entry point both MCP tools and the
  scheduler call), `Scheduler` (cron), `StateStore` (SQLite persistence of
  content items, posts, run log, autopilot flags), `queue.ts` (retry/backoff
  + concurrency limiting).
- `creative/` — pluggable provider interfaces (`types.ts`) and concrete
  clients: `genericLLM.ts` (OpenAI-compatible + Anthropic), `higgsfield.ts`,
  `leonardo.ts`, `elevenlabs.ts`. `trendEngine.ts` and `scriptWriter.ts` turn
  a niche into a full content brief; `videoPipeline.ts` turns a brief into
  rendered assets. `providerFactory.ts` wires `providerRegistry` config
  entries into concrete instances.
- `quality/` — `qualityGate.ts` (composite scoring + regenerate loop) and
  `policyFilter.ts` (hard-coded safety patterns + LLM compliance review,
  always on regardless of autopilot state).
- `platforms/` — one `SocialPlatformAgent` implementation per platform, plus
  `registry.ts` which instantiates exactly one agent per enabled account.
- `tools/index.ts` — MCP tool registrations wrapping `Orchestrator` methods.
- `index.ts` — MCP stdio server entry point (scheduler runs alongside it).
- `cli.ts` — standalone daemon/one-shot/status CLI; this is what you run
  under systemd/PM2/Docker for true unattended operation with no MCP client
  attached at all.

## Design decisions worth knowing

- **One content item, many posts.** A single campaign run generates one
  video and fans it out to every account the campaign targets — that's the
  "one agent per account, one campaign, all platforms" model the brief
  asked for. If you want platform-specific edits (e.g. different aspect
  ratios or captions per platform), extend `ContentItem`/`VideoPipeline` to
  produce per-platform variants; the agents already accept whatever
  `videoAssetUrl`/`caption` they're handed.
- **Autonomous and manual runs share one code path.** `run_campaign_now`
  (MCP tool) and the cron-triggered scheduler call the identical
  `Orchestrator.runCampaignOnce`. There is no "skip the quality gate because
  no human is watching" branch — the gate is the same either way.
- **Fail closed on policy checks.** If the LLM policy reviewer's response
  can't be parsed, the content is treated as non-compliant rather than
  silently passed through.

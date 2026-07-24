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
   │  learningEngine  │─────▶│  TrendSource         │  topPerformers bias ideation
   │  (past winners)  │      └──────────┬──────────┘
   └─────────────────┘                 ▼
                              ┌────────────────────┐
                              │  scriptWriter        │  idea -> hook/script/caption/
                              │  (+ SEO in one pass)  │  hashtags/seoTitle/keywords/altText
                              └──────────┬──────────┘
                                        ▼
                              ┌────────────────────┐
                              │  VideoPipeline       │  script (+ product ref image) ->
                              │  (Failover LLM/Video) │  rendered video (Higgsfield/etc.)
                              └──────────┬──────────┘
                                        ▼
                              ┌────────────────────┐
                              │  QualityGate         │  scores + policy check; regenerates
                              │  (loop until >=      │  until threshold met or attempts
                              │   threshold)          │  exhausted
                              └──────────┬──────────┘
                                        ▼ (only if passed)
                              ┌────────────────────┐
                              │  commerce/checkout    │  Stripe Checkout link -> CTA in caption
                              │  (only if productId)  │
                              └──────────┬──────────┘
                     ┌──────────────────┼──────────────────┐
                     ▼                  ▼                  ▼
              TikTokAgent        InstagramAgent       ...one SocialPlatformAgent
              (account A)         (account B)          per configured account
                     │                  │                  │
                     ▼                  ▼                  ▼
                 posts to           posts to            posts to
                 TikTok API         Meta Graph API       ...

   (independent, scheduled separately)
   ┌─────────────────┐        ┌─────────────────┐
   │ engagementAgent  │        │ analytics/       │
   │ polls comments,  │        │ collector.ts     │
   │ answers Q&A       │        │ pulls post metrics,
   │ (every 15 min)    │        │ feeds learningEngine
   └─────────────────┘        │ (every 2 hours)   │
                               └─────────────────┘
```

## Module map

- `config/` — YAML+env config loading and validation (zod), shared types
  (accounts, campaigns, products, commerce, engagement, analytics).
- `core/` — `Orchestrator` (the single entry point both MCP tools and the
  scheduler call), `Scheduler` (cron: posting + nightly smart-reschedule +
  analytics collection + engagement polling), `StateStore` (SQLite
  persistence — content items, posts, run log, autopilot flags,
  `post_metrics`, `timing_stats`, `handled_comments`), `queue.ts`
  (retry/backoff + concurrency limiting), `failover.ts` (self-healing
  provider fallback chains).
- `creative/` — pluggable provider interfaces (`types.ts`) and concrete
  clients: `genericLLM.ts` (OpenAI-compatible + Anthropic), `higgsfield.ts`,
  `leonardo.ts`, `elevenlabs.ts`. `trendEngine.ts` and `scriptWriter.ts` turn
  a niche (plus any learned top performers / product) into a full content
  brief including SEO metadata; `videoPipeline.ts` turns a brief into
  rendered assets. `providerFactory.ts` wires `providerRegistry` config
  entries into concrete instances, wrapped in failover decorators when a
  campaign declares a provider chain.
- `seo/` — assembles/validates the SEO metadata the script writer generates
  into what each platform actually wants at post time.
- `commerce/` — `checkout.ts` (Stripe Checkout session creation, with a
  UTM-tagged fallback URL when Stripe isn't configured) and
  `productPlacement.ts` (reference image + caption CTA embedding).
- `quality/` — `qualityGate.ts` (composite scoring + regenerate loop) and
  `policyFilter.ts` (hard-coded safety patterns + LLM compliance review,
  always on regardless of autopilot state — also reused by the engagement
  agent to vet drafted comment replies).
- `platforms/` — one `SocialPlatformAgent` implementation per platform, plus
  `registry.ts` which instantiates exactly one agent per enabled account.
  Each agent optionally implements `fetchRecentComments`/`replyToComment`
  (engagement loop) and `fetchMetrics` (analytics loop).
- `engagement/engagementAgent.ts` — polls recent posts' comments, classifies
  and drafts replies, policy-checks them, and posts approved replies.
- `analytics/collector.ts` — pulls fresh metrics per post via each agent's
  `fetchMetrics` and records them. `analytics/learningEngine.ts` turns that
  history into learned posting slots and top-performing topics.
- `tools/index.ts` — MCP tool registrations wrapping `Orchestrator` methods.
- `index.ts` — MCP stdio server entry point (scheduler runs alongside it).
- `cli.ts` — standalone daemon/one-shot/status CLI; this is what you run
  under systemd/PM2/Docker for true unattended operation with no MCP client
  attached at all.

## Design decisions worth knowing

- **One content item, many posts.** A single campaign run generates one
  video and fans it out to every account the campaign targets — that's the
  "one agent per account, one campaign, all platforms" model the brief
  asked for. Checkout links/UTM attribution are therefore per content item,
  not per platform; see the commerce section of the README for the tradeoff.
- **Autonomous and manual runs share one code path.** `run_campaign_now`
  (MCP tool) and the cron-triggered scheduler call the identical
  `Orchestrator.runCampaignOnce`. There is no "skip the quality gate because
  no human is watching" branch — the gate is the same either way. The same
  is true of comment replies: the engagement agent runs the drafted reply
  through `checkPolicyCompliance` before ever posting it.
- **Fail closed on policy checks.** If the LLM policy reviewer's response
  can't be parsed, the content (or reply) is treated as non-compliant rather
  than silently passed through.
- **Learning is heuristic and inspectable, not a trained model.** Timing and
  content-topic "learning" are both simple, auditable aggregates over
  `post_metrics`/`content_items` — see the README's "Self-improving" section
  for exactly what each loop does.

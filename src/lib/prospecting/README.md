# Social Prospecting Pipeline

A compliant social-listening and outreach system: it finds people publicly
expressing a need on social platforms, scores their buying intent, matches a
product/affiliate offer, and drafts an outreach message that a human approves
before anything is sent.

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

Connectors are only active when their credentials are present; otherwise the
dashboard shows them as "no credentials" and they are skipped.

## Compliance notes

The per-platform policy table in `compliance.ts` encodes conservative defaults,
**not legal advice**. Keep it in sync with each platform's current developer
terms and your local marketing law (GDPR/CCPA, CAN-SPAM, TCPA). Honor opt-outs
immediately via the suppression list. Crisis-sentiment posts are never marketed
to.

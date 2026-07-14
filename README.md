# Solvana — AI-Powered Debt Settlement

> **Owe less. AI negotiates the rest away.**

Solvana is a debt settlement SaaS run entirely by specialized AI agents. It helps
consumers and small businesses reduce what they owe on **unsecured debts** —
credit cards, medical bills, personal loans — by negotiating lump-sum settlements
with creditors. Solvana never pays debts directly and charges **no upfront fees**.

## How the program works

1. **Stop payments, start saving** — clients stop paying enrolled creditors and
   make monthly deposits into a dedicated, FDIC-insured savings account **they
   own and control** at an independent partner bank.
2. **AI negotiates** — once funds accumulate, the negotiation agent works each
   creditor for a reduced one-time lump-sum payoff.
3. **Settle** — when a creditor accepts and the client approves, funds move from
   the client's account; the remaining balance is forgiven in writing.

**Fees:** 15–25% of enrolled debt, charged per debt only after settlement +
client approval + first settlement payment (the FTC advance-fee ban, enforced in
code). **Eligibility:** $7,500+ in qualifying unsecured debt. **Timeline:**
typically 24–36 months. Secured debts and federal student loans never qualify.

## The AI agent workforce

Nine specialists, each with its own voice, system prompt, tool grants, and
escalation rules (`src/lib/agents/registry.ts`):

| Agent | Specialty |
|---|---|
| **Aria** | Enrollment & intake — eligibility, TSR disclosures, ESIGN |
| **Atlas** | Debt analysis — tradeline classification, SOL, creditor modeling |
| **Nova** | Lead negotiator — creditor settlements, offer strategy |
| **Ledger** | Dedicated account & payments — drafts, disbursements, fee gate |
| **Sentinel** | Compliance guardrails — vetoes any non-compliant action |
| **Echo** | Voice communications — realtime speech, consent, 30+ languages |
| **Sage** | Client success — monthly reviews, hardship, honest exits |
| **Pulse** | Credit & risk monitoring — litigation-propensity scoring |
| **Guardian** | Escalations — FDCPA violations, lawsuits → human attorneys |

## Legal framework (in code)

- `src/lib/agents/compliance.ts` — TSR §310.4(a)(5) fee gate, the eight required
  disclosures, dedicated-account requirements, TCPA calling hours, prohibited
  claims, state licensing gate.
- `src/lib/agents/orchestrator.ts` — routing with compliance checks on every
  handoff; escalation to human attorneys/supervisors.
- `/legal/disclosures`, `/legal/terms`, `/legal/privacy`, `/legal/licensing` —
  full public disclosure pages.

## Stack & development

Next.js 15 (App Router) · React 19 · Tailwind CSS 4 · shadcn/ui · TypeScript.

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
```

Key routes: `/` (landing) · `/how-it-works` · `/agents` · `/pricing` (fees) ·
`/qualify` (eligibility + savings estimator) · `/portal` (client app) ·
`/admin` (staff console) · `/api/agents` (public roster) · `/api/health`.

## Installable app (PWA)

Solvana installs to a phone or desktop home screen and launches standalone.
It ships a web manifest (`src/app/manifest.ts`), branded icons
(`public/icons/`), an offline fallback, and a service worker (`public/sw.js`)
that caches static assets and never caches API/auth/portal responses. An
"Install app" prompt appears when the browser reports installability.

## Deployment

Runs on any Next.js host. Two paths are wired up:

**Cloudflare Workers** (cheapest always-on) via OpenNext:

```bash
npm run cf:preview   # build + run locally on the workerd runtime
npm run cf:deploy    # build + deploy (after `npx wrangler login`)
```

`wrangler.jsonc` sets `nodejs_compat` (required — auth uses `node:crypto`).
Push-to-deploy is available via `.github/workflows/deploy-cloudflare.yml` once
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repo secrets are set.

**Vercel** works zero-config from `vercel.json`.

**Database:** set `TURSO_CONNECTION_URL` + `TURSO_AUTH_TOKEN` and run
`bash scripts/setup-turso.sh` to create the DB and apply migrations. Without
them the app uses an in-memory store (fine for demos; resets on restart).

**Required env:** `SESSION_SECRET` (portal + admin auth). See `.env.example`.

---

*Solvana is a product concept. Operating a real debt settlement business
requires state licensing/bonding, TSR compliance review by counsel, and a
partner bank for dedicated accounts.*

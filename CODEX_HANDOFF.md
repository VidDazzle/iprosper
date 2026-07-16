# Codex Handoff — Connecting the Anthropic (Claude) API

This document is for whoever wires up the live AI. The AI calendar + encrypted
email systems are already built and working (see `AI_SYSTEMS.md`); they run on
deterministic heuristics until a Claude API key is connected. Connecting the key
upgrades scheduling parsing, mail triage, and email drafting to full Claude
intelligence. **No code changes are required to turn it on — it's environment
config only.**

## TL;DR

1. Get a key from https://console.anthropic.com/ (starts with `sk-ant-`).
2. Set `ANTHROPIC_API_KEY` in the environment (locally: `.env.local`; in prod:
   the host's env/secrets manager — this is Vercel, so Project → Settings →
   Environment Variables).
3. Redeploy / restart. Done — the system auto-detects the key.

That's the whole integration. Everything below is detail.

## The single integration point

All Claude calls go through **one file**: `src/lib/ai.ts`. Nothing else in the
codebase talks to the API. It exposes three functions used across the calendar,
mailbox, and voice-agent webhook:

| Function | Used by | What it does |
|---|---|---|
| `parseSchedulingRequest(text, nowIso)` | `/api/calendar/schedule`, voice agent `book_meeting` | NL → structured booking fields |
| `triageEmail(subject, body)` | `/api/mail/messages` (inbound) | priority + category + summary |
| `draftEmail(instruction, context?)` | `/api/mail/compose`, voice agent `send_email`/`draft_email` | writes subject + body |
| `generateTagline(avoid?)` | outbound send paths | fresh funny sign-off one-liner (Gen Z / millennial / techie voice); falls back to the curated list in `taglines.ts` when no key |

Each function:
- Uses the official `@anthropic-ai/sdk` (already installed, `^0.111.0`).
- Calls `client.messages.parse()` with **structured outputs**
  (`output_config.format` + a JSON schema) so responses are guaranteed to match
  the expected shape — no brittle string parsing.
- **Falls back to a deterministic heuristic** if the key is missing, the call
  errors, or the model refuses. So the app never breaks; it just gets smarter
  when the key is present.

## Configuration

| Variable | Required? | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | To enable AI | The SDK reads it from the env automatically. Without it, `aiConfigured()` returns false and every AI function uses its heuristic fallback. |
| `AI_MODEL` | Optional | Defaults to **`claude-opus-4-8`** (the most capable model). Override only if you have a specific reason (e.g. `claude-sonnet-5` for lower cost). Use exact model IDs — no date suffixes. |

## Important API notes (already handled — don't reintroduce)

These are baked into `src/lib/ai.ts`; flagging them so they aren't "helpfully"
added back during a refactor:

- **Do NOT send `temperature`, `top_p`, or `top_k`.** They are rejected with a
  **400** on `claude-opus-4-8` / `claude-sonnet-5` / `claude-fable-5`. The code
  deliberately omits them; steer behavior with the prompt instead.
- **Do NOT add `thinking: {type:"enabled", budget_tokens:N}`.** Removed on these
  models (400). If you want reasoning, use `thinking: {type:"adaptive"}` — but
  it's unnecessary for these short structured tasks and is intentionally off.
- **Structured outputs** use `output_config: { format: { type: "json_schema",
  schema } }` on `messages.parse()`. The old top-level `output_format` param is
  deprecated — don't switch to it.

## Verify it's live

After setting the key, confirm the AI path (not the fallback) is active:

1. **Health check** — the voice-agent manifest reports config state:
   ```bash
   curl https://YOUR_APP/api/voice-agent      # GET, no auth needed
   # → { ..., "encryptionConfigured": true/false, ... }
   ```
   (This reports encryption + agent-auth state; AI state is reported per-call.)

2. **Scheduling** — the response includes an `aiEnabled` flag:
   ```bash
   curl -X POST https://YOUR_APP/api/calendar/schedule \
     -H "Content-Type: application/json" \
     -d '{"text":"30 minute demo with sam@acme.com next Tuesday at 2pm","book":false}'
   # → { "parsed": {...}, "chosenSlot": {...}, "aiEnabled": true }
   ```
   `aiEnabled: true` means the key is connected and Claude parsed the request.
   With a hard NL case like "sometime after lunch next week", the heuristic
   returns `Meeting` with null date/time, while Claude resolves it — a good
   before/after check.

3. **Drafting** — `/api/mail/compose` returns `aiEnabled` and a `note` when the
   key is missing:
   ```bash
   curl -X POST https://YOUR_APP/api/mail/compose \
     -H "Content-Type: application/json" \
     -d '{"instruction":"thank them for the demo and propose a follow-up next week"}'
   # → { "draft": { "subject": "...", "body": "..." }, "aiEnabled": true }
   ```

## Related config the AI does NOT depend on (but the systems do)

These are separate from the Claude key — see `.env.example` and `AI_SYSTEMS.md`:

- `MAIL_ENCRYPTION_KEY` — required for the mailbox (AES-256-GCM at rest).
- `VOICE_AGENT_API_KEY` — required for the voice-agent webhook auth.
- `TURSO_CONNECTION_URL` / `TURSO_AUTH_TOKEN` — the database.
- `RESEND_API_KEY` — optional, to actually send outbound email.

## Cost / rate-limit note

Each scheduling parse, triage, or draft is one short Claude request (hundreds of
tokens in, hundreds out). Triage runs once per inbound email; parsing/drafting
run on demand. There's no polling or background AI loop, so spend tracks user
and caller activity. Set usage limits in the Anthropic Console if desired.

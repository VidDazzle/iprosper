# Wiring Evolve into the OS

This guide shows how to connect the existing Evolve stack — the Next.js app (`iprosper`), its database, and third-party services — into Evolve AI OS.

## Mental model

- **The OS is the control plane.** Your apps and services become **connectors**. Your users, agents, and backend services become **principals** holding scoped **tokens**.
- Agents never call services directly. They call connectors through the `ConnectorHub`, which enforces the capabilities declared in the agent's manifest and can be audited centrally.

## 1. Wrap an Evolve service as a connector

Any HTTP service (including a Next.js route handler) can be wrapped with the built-in `HttpServiceConnector`:

```ts
import { Kernel, HttpServiceConnector } from "evolve-os";

const kernel = Kernel.boot();

kernel.connectors.register(
  new HttpServiceConnector(
    "evolve.web",                    // connector id (referenced by manifests)
    "Evolve Web App",
    "connector:invoke",              // required capability
    "https://app.evolve.example",    // base URL
    { authorization: `Bearer ${process.env.EVOLVE_WEB_TOKEN}` },
  ),
);
```

For richer contracts (voice, payments, CRM), implement the `Connector` interface directly — see `src/connectors/builtin.ts` for the `EvolveVoiceConnector` example.

## 2. Wire the database

The Evolve app uses Drizzle + libSQL. Two integration points:

- **As a connector** for agents that need data access, gated by a capability like `connector:invoke` (and, if you add fine-grained caps, `data:read`/`data:write`).
- **As the OS's own durable store** by implementing the `AuditSink` / `TaskQueue` interfaces against libSQL (see `docs/CODEX_HANDOFF.md`, priority 1).

> Note: the marketing site's `email_captures` table currently stores a `passwordAttempt` in plaintext. When you route auth through the OS, hash secrets with `hashSecret` (scrypt) instead of storing raw attempts, and encrypt any retained PII with `encryptJson` so it is KMS-wrapped at rest.

## 3. Issue scoped tokens to agents and app sessions

```ts
import type { Principal } from "evolve-os";

// A backend service principal for the Next.js app:
const appPrincipal: Principal = {
  id: "evolve-web", kind: "service", displayName: "Evolve Web",
  tenantId: "evolve", roles: ["operator"],
};

// Mint a least-privilege token the app presents to the control plane:
const token = kernel.issueTokenFor(appPrincipal, ["agent:read", "task:submit"], "control-plane");
```

The app then calls the control plane with `Authorization: Bearer <token>`. The gateway verifies it on every request.

## 4. Register and deploy an Evolve agent

```ts
const rec = kernel.registry.register({
  name: "evolve-voice-concierge", version: "1.0.0",
  displayName: "Voice Concierge", description: "Handles inbound voice turns.",
  tenantId: "evolve", runtime: "claude-fable-5",
  capabilities: ["task:read", "task:complete", "connector:invoke"],
  connectors: ["evolve.voice"],
  limits: { maxConcurrency: 4, maxTaskDurationMs: 120000, callsPerSec: 5 },
  autonomous: true,
});
kernel.registry.transition(rec.id, "reviewing");
kernel.registry.transition(rec.id, "approved");
kernel.registry.transition(rec.id, "deployed");
```

## 5. Submit work and let the OS orchestrate

```ts
const task = await kernel.orchestrator.submit(appPrincipal, rec.id, { utterance: "Book a demo" });
// Dispatch happens on the orchestrator's tick loop, within the agent's limits,
// and every step is written to the tamper-evident audit ledger.
```

## 6. Embedding directly in the Next.js app (optional)

Because the OS has no runtime dependencies, you can import the kernel straight into a Next.js server action or route handler instead of running a separate control-plane process:

```ts
// app/api/agents/route.ts
import { Kernel } from "evolve-os";
const kernel = Kernel.boot();          // reads EVOLVE_* from env
export async function GET() {
  return Response.json({ agents: kernel.registry.list("evolve") });
}
```

For production, run the control plane as its own service (see `Dockerfile`) so agent orchestration scales independently of the web tier.

## Mapping Evolve's services to connectors (suggested)

| Evolve capability | Connector id | Notes |
|---|---|---|
| Real-time voice agents | `evolve.voice` | reference stub provided; point at your voice backend |
| Web app / marketing site | `evolve.web` | `HttpServiceConnector` |
| Database (libSQL/Drizzle) | `evolve.data` | implement `Connector` with query allow-list |
| Email / newsletter | `evolve.email` | `HttpServiceConnector` to your ESP |
| Payments | `evolve.billing` | implement `Connector`; keep PCI data in envelopes |
| Third-party AI (image/video/audio) | `evolve.media` | `HttpServiceConnector` per provider |

Each connector is independently capability-gated, rate-limited, and audited.

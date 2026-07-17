# Evolve AI OS

**A security-first control plane and kernel for building, sandboxing, orchestrating, and governing autonomous AI agents.**

Evolve AI OS is the operating layer that Evolve's products, services, and agents plug into. It is not a desktop OS competing with Windows or macOS — it is an *agent operating system*: the secure substrate that registers every agent, enforces least privilege on every action, wires in every service through typed connectors, and records every decision in a tamper-evident ledger.

It is written in TypeScript with **zero runtime dependencies** (Node.js built-ins only), so it runs anywhere Node runs, audits cleanly, and hands off without a supply chain to vet.

---

## Why it exists

Evolve builds AI agents and autonomous AI products of all types. Those agents need a home that gives them:

- **Identity** — every human, agent, and service is a verifiable principal.
- **Least privilege** — an agent can only touch the capabilities and connectors it declared, enforced by the kernel on every dispatch.
- **Defense** — a zero-trust gateway, rate limiting, and a bot/prompt-injection threat detector in front of everything.
- **Governance** — a hash-chained audit log that makes tampering detectable.
- **Orchestration** — a task queue and dispatcher that runs agents within their declared resource limits.
- **Integration** — a connector framework to wire in all of Evolve's services and apps under policy control.

## Architecture at a glance

```
                         ┌──────────────────────────────┐
   clients / agents ───► │   Zero-Trust Gateway         │  token verify + threat scan
                         └───────────────┬──────────────┘
                                         │ authenticated principal + capabilities
                         ┌───────────────▼──────────────┐
                         │        Policy Engine          │  rate limit → threat → RBAC → guardrails
                         └───────────────┬──────────────┘
             ┌───────────────────────────┼───────────────────────────┐
             ▼                           ▼                           ▼
     ┌───────────────┐          ┌────────────────┐          ┌────────────────┐
     │ Agent Registry│          │  Orchestrator  │          │ Connector Hub  │
     │ + lifecycle   │◄────────►│  queue+dispatch│◄────────►│ evolve services│
     └───────────────┘          └───────┬────────┘          └────────────────┘
                                        │
                         ┌──────────────▼───────────────┐
                         │   Crypto Core + KMS           │  AES-256-GCM · Ed25519 · scrypt · envelope
                         └──────────────┬───────────────┘
                         ┌──────────────▼───────────────┐
                         │  Tamper-Evident Audit Ledger  │  hash-chained + signed
                         └──────────────────────────────┘
```

Full detail in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Quick start

```bash
cd evolve-os
npm install          # installs only typescript + @types/node (devDeps)
npm run build        # compile to dist/
npm test             # 20 tests: crypto, policy, audit tamper-detection, kernel
npm run smoke        # end-to-end: register → deploy → run a task → verify audit
npm start            # boot the control-plane HTTP server on :8787
```

### Try the API

```bash
# 1. Bootstrap an owner token (dev only; prod requires EVOLVE_ADMIN_KEY)
TOKEN=$(curl -s -X POST localhost:8787/v1/auth/bootstrap \
  -H 'content-type: application/json' -d '{"tenantId":"evolve"}' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')

# 2. Register an agent from a manifest
curl -s -X POST localhost:8787/v1/agents -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d '{
    "name":"voice-concierge","version":"1.0.0","displayName":"Voice Concierge",
    "description":"Handles inbound voice","runtime":"claude-fable-5",
    "capabilities":["connector:invoke"],"connectors":["evolve.voice"],
    "limits":{"maxConcurrency":2,"maxTaskDurationMs":8000,"callsPerSec":5},
    "autonomous":true }'

# 3. Read + verify the tamper-evident audit chain
curl -s localhost:8787/v1/audit -H "authorization: Bearer $TOKEN"
```

## Generating production secrets

```bash
npm run keygen   # prints EVOLVE_KMS_ROOT_KEY + Ed25519 token keys
```

Pipe the output into your secret manager. See [`.env.example`](.env.example).

## Security model

Read [`docs/SECURITY.md`](docs/SECURITY.md) for the full threat model. In short: strong, standards-based cryptography (AES-256-GCM authenticated encryption, envelope encryption with a KMS abstraction, Ed25519 signatures, scrypt password hashing), a zero-trust request path where nothing is trusted by network position, and a hash-chained audit ledger.

## Wiring Evolve into the OS

See [`docs/INTEGRATION_EVOLVE.md`](docs/INTEGRATION_EVOLVE.md) for how to connect the existing Evolve Next.js app, databases, and third-party services as connectors, and how to issue scoped tokens to your agents.

## Project layout

```
evolve-os/
├── src/
│   ├── crypto/        AES-256-GCM, KMS/envelope, Ed25519, scrypt, secure random
│   ├── identity/      principals, RBAC, verifiable capability tokens
│   ├── audit/         tamper-evident hash-chained ledger
│   ├── policy/        rate limiter, threat detector, policy decision point
│   ├── agents/        agent manifests + lifecycle registry
│   ├── orchestrator/  event bus, task queue, dispatcher
│   ├── connectors/    connector framework + reference connectors
│   ├── gateway/       zero-trust authentication front door
│   ├── config/        env-driven configuration (fails closed in prod)
│   ├── kernel/        the microkernel that wires it all together
│   └── server.ts      control-plane HTTP server (Node http, no deps)
├── test/              node:test suites
├── scripts/           keygen, smoke test
└── docs/              architecture, security, handoff, integration
```

## Status & honest scope

This is a **production-grade foundation**, not a finished planet-scale cloud. The cryptography, authorization, audit, and orchestration logic are real and tested. The persistence layer (in-memory today), the agent execution runtime (a demo executor today), and horizontal scaling are the documented next steps — see [`docs/CODEX_HANDOFF.md`](docs/CODEX_HANDOFF.md), which is written specifically to let Codex or your team take it forward.

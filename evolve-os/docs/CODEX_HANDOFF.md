# Codex Handoff Guide

This package is a working, tested foundation for the Evolve AI OS. It is built so that Codex (or the Evolve team) can extend it confidently. This guide tells you exactly where the seams are and what to build next, in priority order.

## What is done and verified

- ✅ Cryptographic core: AES-256-GCM AEAD, KMS + envelope encryption with rotation, Ed25519 signing, scrypt hashing. (`src/crypto`)
- ✅ Identity: principals, RBAC with wildcards/inheritance, Ed25519 verifiable capability tokens with expiry + revocation. (`src/identity`)
- ✅ Tamper-evident audit ledger with chain verification. (`src/audit`)
- ✅ Policy engine: rate limiting, bot/injection threat detection, RBAC, guardrails. (`src/policy`)
- ✅ Agent registry with a guarded lifecycle state machine. (`src/agents`)
- ✅ Orchestrator: queue, dispatch, concurrency + timeout enforcement, retries, audit. (`src/orchestrator`)
- ✅ Connector framework + reference connectors. (`src/connectors`)
- ✅ Zero-trust gateway + control-plane HTTP server. (`src/gateway`, `src/server.ts`)
- ✅ Self-healing: metrics registry, circuit breakers on every connector, supervisor that quarantines + recovers agents. (`src/observability`, `src/reliability`)
- ✅ Self-optimizing: AIMD controller that tunes agent concurrency from live metrics. (`src/optimization`)
- ✅ Multi-agent fleet: cooperating executable agents with capability-scoped delegation. (`src/agents/fleet.ts`, `builtin-agents.ts`)
- ✅ MCP server: the OS exposed as Model Context Protocol tools over stdio for Claude/Codex. (`src/mcp`, `src/mcp-server.ts`)
- ✅ 30 passing tests + an end-to-end smoke script. Clean `tsc --strict` build, zero runtime deps.

Run `npm test && npm run smoke` to confirm on your machine.

## Build priorities (in order)

### 1. Durable persistence (highest priority)
Everything is in-memory. Implement the interfaces against an encrypted database (Postgres recommended; the Evolve app already uses Drizzle + libSQL, so a libSQL/Turso adapter is a natural fit).
- `AuditSink` (`src/audit/audit-log.ts`) → append-only table with object-lock/WORM semantics.
- `TaskQueue` (`src/orchestrator/task-queue.ts`) → durable queue (Postgres `SKIP LOCKED` or Redis Streams).
- `AgentRegistry` (`src/agents/registry.ts`) → agents table.
- Store secrets/PII as `Envelope`s via `encryptJson` so DEKs are KMS-wrapped.

### 2. Real agent runtime
The multi-agent `Fleet` (`src/agents/fleet.ts`) is already the executor; the reference agents in `builtin-agents.ts` have stub `handle` bodies. Replace those with real LLM agent loops (Claude via the Anthropic SDK), a workflow engine, or sandboxed workers — the coordination/delegation contract stays the same. Enforce isolation here: separate process/VM, egress allow-list, CPU/memory cgroups. The `AgentContext` already carries capabilities, capability-gated connector access, `delegate`, and an `AbortSignal`.

### 3. Production KMS + secrets
Swap `LocalKeyring` for AWS KMS / GCP KMS / Vault by implementing the `Kms` interface (`src/crypto/kms.ts`). Load `EVOLVE_*` secrets from a secret manager, not env files.

### 4. Identity provider
Replace `/v1/auth/bootstrap` with real OIDC/SAML SSO. Map IdP claims → `Principal.roles`. Keep the verifiable-token issuance (`kernel.issueTokenFor`) as the internal session format.

### 5. Horizontal scale + observability
Run multiple stateless control-plane instances behind a load balancer. Move `EventBus` to NATS/Kafka. Add OpenTelemetry tracing/metrics and ship the audit stream to your SIEM.

### 6. Edge hardening
Front the control plane with a WAF + DDoS protection and mTLS for east-west traffic. See `docs/SECURITY.md`.

## Conventions to preserve

- **No home-rolled crypto.** Use the primitives in `src/crypto` or a vetted KMS/HSM.
- **Fail closed.** New privileged paths must go through `PolicyEngine.authorize` and write an audit entry.
- **Least privilege.** New capabilities are additive permission strings (`resource:action`); grant the minimum.
- **Keep the core dependency-light.** Add dependencies only at the edges (DB driver, cloud SDKs), never in the crypto/identity/audit core.
- **Everything strict.** `tsc --strict` with `noUncheckedIndexedAccess` must stay green.

## Suggested repo split when it grows

Today it is one cohesive package for easy review. When it grows, split into workspaces: `@evolve-os/core-crypto`, `@evolve-os/identity`, `@evolve-os/audit`, `@evolve-os/policy`, `@evolve-os/orchestrator`, `@evolve-os/connectors`, `@evolve-os/control-plane`. The module boundaries already match this.

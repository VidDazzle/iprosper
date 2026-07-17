# Evolve AI OS — Architecture

## Design principles

1. **Microkernel.** A small, security-critical core (`Kernel`) owns identity, crypto, policy, and audit. Everything else — agents, connectors, orchestration — is a module composed around it. The kernel is the only thing that must be trusted.
2. **Zero trust.** No request is trusted by network position. Every call presents a verifiable token, is threat-scanned, and is resolved to a least-privilege principal before any handler runs.
3. **Least privilege by declaration.** Agents declare, in a manifest, exactly which capabilities and connectors they need. The kernel enforces that ceiling on every dispatch — a compromised agent cannot exceed its manifest.
4. **Everything is audited.** Every privileged decision writes to a hash-chained, optionally-signed ledger. Tampering is detectable.
5. **Swappable seams.** Storage, KMS, message bus, and the agent runtime are interfaces. The in-process implementations shipped here can be replaced with AWS KMS, Postgres, NATS, or a sandboxed worker pool without touching callers.
6. **No runtime dependencies.** The core uses only Node.js built-ins (`node:crypto`, `node:http`). This shrinks the attack surface, eliminates supply-chain risk, and keeps the handoff clean.

## Subsystems

### Crypto core (`src/crypto`)
- `aead.ts` — AES-256-GCM authenticated encryption (AEAD) with optional associated data for context binding.
- `kms.ts` — a `Kms` interface plus `LocalKeyring`, a software KMS that derives versioned key-encryption keys (KEKs) from a root master key via HKDF-SHA-512 and supports rotation. Swap for AWS/GCP KMS or an HSM in production.
- `envelope.ts` — envelope encryption: bulk data is encrypted with a per-record data key (DEK); only the small DEK is wrapped by the KMS.
- `signing.ts` — Ed25519 signatures for tokens, agent identity, and audit anchoring.
- `hashing.ts` — SHA-256/512, HMAC, scrypt password hashing, constant-time comparison.
- `random.ts` — CSPRNG helpers and prefixed ids.

### Identity (`src/identity`)
- `principals.ts` — every actor (human, agent, service, system) is a `Principal` scoped to a tenant.
- `rbac.ts` — colon-delimited permissions (`agent:deploy`) with wildcard and inheritance support, plus a set of sensible default roles.
- `tokens.ts` — compact, Ed25519-signed **verifiable tokens** (JWS/EdDSA-like) carrying an explicit least-privilege capability set, expiry, and a revocation id.

### Audit (`src/audit`)
- `audit-log.ts` — an append-only ledger where each entry embeds the SHA-256 hash of the previous entry (a hash chain). `verifyChain` detects any modification, insertion, or deletion. Entries are optionally Ed25519-signed for external verification.

### Policy (`src/policy`)
- `rate-limiter.ts` — per-key token-bucket limiter.
- `threat-detector.ts` — transparent heuristic scoring for bots, prompt-injection, and malicious payloads (SQLi/XSS/traversal/log4shell signatures).
- `policy-engine.ts` — the Policy Decision Point. Combines, in order: rate limit → threat scan → RBAC → custom guardrails. One deny is a deny; every decision is explainable.

### Agents (`src/agents`)
- `manifest.ts` — the declarative agent contract (capabilities, connectors, resource limits) with validation.
- `registry.ts` — a guarded lifecycle state machine: `registered → reviewing → approved → deployed → paused/quarantined → retired`. Only `deployed` agents receive tasks; the policy engine can quarantine a misbehaving agent.

### Orchestrator (`src/orchestrator`)
- `event-bus.ts` — typed in-process pub/sub (the seam for NATS/Kafka).
- `task-queue.ts` — priority queue with attempts/retries (the seam for Postgres/Redis).
- `orchestrator.ts` — admits tasks after authorization, enforces per-agent concurrency and timeouts, retries with backoff bookkeeping, and audits every outcome. The `AgentExecutor` interface is how a real agent runtime plugs in.

### Connectors (`src/connectors`)
- `connector.ts` — the `Connector` interface and `ConnectorHub`. Agents never call the outside world directly; they call connectors through the hub, which enforces capability scoping. This is how Evolve's services and apps are wired in.
- `builtin.ts` — `HttpServiceConnector` (wrap any HTTP service) and `EvolveVoiceConnector` (reference example).

### Gateway (`src/gateway`)
- `gateway.ts` — the zero-trust front door: threat pre-screen → token verification → principal resolution. Returns the caller's least-privilege capability set to the control plane.

### Observability (`src/observability`)
- `metrics.ts` — a dependency-free metrics registry: counters, a rolling latency window (p50/p95), and per-agent success/failure streaks. It is the shared signal source for both autonomic loops.

### Reliability — self-healing (`src/reliability`)
- `circuit-breaker.ts` — closed/open/half-open breaker. The `ConnectorHub` wraps every connector call in one, so a failing dependency fails fast and is auto-probed for recovery.
- `supervisor.ts` — the autonomic nervous system: subscribes to task events, auto-quarantines an agent whose consecutive-failure streak crosses a threshold, and runs a recovery loop that returns cooled-down agents to service. Every action is audited and alerted.

### Optimization — self-optimizing (`src/optimization`)
- `optimizer.ts` — a closed-loop AIMD controller (the TCP-congestion control family). It reads live metrics and, per agent: additively increases concurrency when the agent is reliable and saturated, and multiplicatively decreases it when the agent is failing — always within bounds, always audited.

### Multi-agent fleet (`src/agents/fleet.ts`, `builtin-agents.ts`)
- `fleet.ts` — the `Fleet` implements `AgentExecutor`: it maps a dispatched task to a concrete `ExecutableAgent` and runs it in a scoped context. Agents collaborate via `ctx.delegate`, which re-resolves each peer's own manifest capabilities (least privilege per hop) and is depth-limited.
- `builtin-agents.ts` — a reference fleet: `VoiceAgent`, `IntentAgent`, `ResponderAgent`, and a `CoordinatorAgent` that composes them into a pipeline.

### MCP interop (`src/mcp`)
- `protocol.ts` / `mcp-server.ts` / `stdio.ts` — a dependency-free Model Context Protocol server (JSON-RPC 2.0 over newline-delimited stdio): `initialize`, `tools/list`, `tools/call`, `ping`.
- `evolve-tools.ts` — wires the OS onto MCP: register/deploy agents, submit tasks to the fleet, read system health, verify the audit chain. This is how Codex/Claude/any MCP client drives the operating system.

### Kernel (`src/kernel`)
- `kernel.ts` — boots and owns every subsystem, issues/verifies/revokes tokens, exposes the public key set, and rotates the KMS. `Kernel.boot()` fails closed in staging/production if signing keys are absent.

## Request lifecycle

```
HTTP request
  └─► read + size-cap body
      └─► Gateway.authenticate
            ├─ threat pre-screen (block obvious abuse)
            ├─ verify Ed25519 token (signature, expiry, revocation, audience)
            └─ resolve Principal + capabilities
      └─► route handler
            ├─ capability check (from token)
            ├─ Orchestrator.submit → PolicyEngine.authorize (rate → threat → RBAC → guardrails)
            ├─ AuditLog.record (hash-chained)
            └─ EventBus.emit
      └─► dispatch tick → AgentExecutor.execute within manifest limits → connectors
```

## Data-at-rest and data-in-transit

- **At rest:** secrets/PII should be stored as `Envelope`s (`encryptJson`) so the DEK is KMS-wrapped and rotatable. Context binding (AAD = tenant id) prevents cross-tenant ciphertext reuse.
- **In transit:** terminate TLS at your ingress/load balancer; the reference server sets HSTS and hardening headers. For service-to-service, layer mTLS (documented as a next step).

## Scaling path

The interfaces (`Kms`, `AuditSink`, `TaskQueue`, `EventBus`, `AgentExecutor`) are the horizontal-scaling seams. Run multiple stateless control-plane instances behind a load balancer; move queue/audit/state to shared durable stores; move the executor to an isolated worker fleet. See `docs/CODEX_HANDOFF.md`.

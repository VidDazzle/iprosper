# Evolve AI OS — Security Model

This document is deliberately candid about what is and isn't protected, so you can deploy with clear eyes.

## What "military / top-grade encryption" means here

There is no secret military algorithm. What actually protects classified and financial systems are a small set of well-vetted, standardized primitives used correctly. Evolve AI OS uses exactly those:

| Concern | Primitive | Where |
|---|---|---|
| Data confidentiality + integrity | **AES-256-GCM** (AEAD, NIST-approved, Suite B / CNSA) | `crypto/aead.ts` |
| Key management | **Envelope encryption** + KMS abstraction, HKDF-SHA-512 KEK derivation, rotation | `crypto/kms.ts`, `crypto/envelope.ts` |
| Signatures / identity | **Ed25519 (EdDSA)** | `crypto/signing.ts` |
| Password / secret hashing | **scrypt** (memory-hard) + constant-time compare | `crypto/hashing.ts` |
| Randomness | OS CSPRNG (`crypto.randomBytes`) | `crypto/random.ts` |
| Token integrity | Ed25519-signed verifiable tokens with expiry + revocation | `identity/tokens.ts` |
| Tamper evidence | SHA-256 hash chain, optionally signed | `audit/audit-log.ts` |

AES-256-GCM and Ed25519 are approved for protecting classified information under NSA's CNSA suite. Using them correctly — authenticated encryption, unique IVs, context binding, no home-rolled crypto — is the actual bar, and that is what this codebase does.

## Threat model

### Defended

- **Unauthorized access** — zero-trust gateway; every request needs a valid, unexpired, non-revoked, correctly-signed token. No trust by network position.
- **Privilege escalation** — tokens carry an explicit least-privilege capability set; agents are further bounded by their manifest. RBAC checks every action.
- **Automated abuse / DoS (application layer)** — per-principal token-bucket rate limiting + request body size caps.
- **Bots & prompt injection** — heuristic threat detector scores automated user-agents, prompt-injection probes, and malicious payload signatures (SQLi, XSS, path traversal, log4shell). High scores are challenged; malicious payloads are blocked at the gateway.
- **Tampering with the record** — hash-chained audit ledger; any edit/delete/insert to history is detected by `verifyChain`.
- **Cross-tenant data reuse** — AAD/context binding on every envelope ties ciphertext to its tenant.
- **Secret sprawl in code** — config fails closed: staging/production refuse to boot without real KMS + signing keys; nothing sensitive is hardcoded.
- **Compromised token** — short TTL + immediate revocation by `jti`.

### Not yet implemented (documented next steps — see CODEX_HANDOFF)

- **Durable, encrypted persistence.** State is in-memory today; wire the `AuditSink`/`TaskQueue`/store interfaces to an encrypted database.
- **mTLS between services.** Terminate TLS at ingress today; add mutual TLS for east-west traffic.
- **Managed WAF / DDoS scrubbing.** The in-process threat detector is a fast first filter, not a replacement for a network-edge WAF and volumetric DDoS protection (Cloudflare/edge).
- **HSM-backed root key.** `LocalKeyring` is software; swap for AWS KMS/CloudHSM or Vault in production.
- **Secret sandboxing of agent execution.** The `AgentExecutor` seam is where you add process/VM isolation, egress allow-lists, and resource cgroups for untrusted agent code.
- **SSO / IdP integration.** The bootstrap endpoint is a stand-in for OIDC/SAML login.

## Operational security checklist

- [ ] Run `npm run keygen`; store `EVOLVE_KMS_ROOT_KEY` and token keys in a secret manager, never in git.
- [ ] Set `EVOLVE_ENV=production` and a strong `EVOLVE_ADMIN_KEY`.
- [ ] Terminate TLS 1.3 at ingress; keep HSTS on.
- [ ] Put a network-edge WAF + DDoS protection in front.
- [ ] Ship the audit ledger to append-only, write-once storage (WORM / object-lock).
- [ ] Rotate KEKs (`kernel.rotateKms()`) and token keys on a schedule.
- [ ] Set per-agent `limits` (concurrency, duration, budget) conservatively; keep new agents in `reviewing` until vetted.
- [ ] Enable egress allow-lists on connectors that reach third parties.

## Reporting

Security issues in this codebase should be triaged privately by the Evolve team before any public disclosure.

import { LocalKeyring } from "../crypto/kms.js";
import { generateSigningKeyPair } from "../crypto/signing.js";
import { secureRandom } from "../crypto/random.js";
import {
  issueToken,
  verifyToken,
  type TokenClaims,
  type VerifyResult,
} from "../identity/tokens.js";
import { RbacRegistry } from "../identity/rbac.js";
import type { Principal } from "../identity/principals.js";
import { AuditLog, MemoryAuditSink } from "../audit/audit-log.js";
import { PolicyEngine } from "../policy/policy-engine.js";
import { AgentRegistry } from "../agents/registry.js";
import { Orchestrator } from "../orchestrator/orchestrator.js";
import { EventBus } from "../orchestrator/event-bus.js";
import { ConnectorHub } from "../connectors/connector.js";
import { loadConfig, type OsConfig } from "../config/config.js";
import { uuid } from "../crypto/random.js";

/**
 * The Evolve OS Kernel. Boots and owns every subsystem, exposes the security
 * primitives (token issue/verify), and provides a single object the control
 * plane and any embedding host can build on. Think of it as the microkernel:
 * small, security-critical, and everything else is a module around it.
 */
export class Kernel {
  readonly config: OsConfig;
  readonly kms: LocalKeyring;
  readonly rbac: RbacRegistry;
  readonly audit: AuditLog;
  readonly policy: PolicyEngine;
  readonly registry: AgentRegistry;
  readonly connectors: ConnectorHub;
  readonly bus: EventBus;
  readonly orchestrator: Orchestrator;

  private readonly tokenKeyId: string;
  private readonly tokenPrivateKeyPem: string;
  private readonly publicKeys: Record<string, string>;
  private readonly revoked = new Set<string>();

  private constructor(config: OsConfig, signing: { kid: string; priv: string; pub: string }) {
    this.config = config;
    this.kms = LocalKeyring.fromRootKey(
      config.kmsRootKeyBase64 || secureRandom(32).toString("base64"),
      1,
    );
    this.rbac = new RbacRegistry();
    this.audit = new AuditLog(new MemoryAuditSink(), {
      keyId: signing.kid,
      privateKeyPem: signing.priv,
    });
    this.policy = new PolicyEngine({
      rbac: this.rbac,
      rateLimit: { ratePerSec: config.rateLimitPerSec, burst: config.rateLimitBurst },
    });
    this.registry = new AgentRegistry();
    this.connectors = new ConnectorHub();
    this.bus = new EventBus();
    this.orchestrator = new Orchestrator({
      registry: this.registry,
      policy: this.policy,
      audit: this.audit,
      bus: this.bus,
    });

    this.tokenKeyId = signing.kid;
    this.tokenPrivateKeyPem = signing.priv;
    this.publicKeys = { [signing.kid]: signing.pub };

    // Surface policy denials + security alerts on the bus for observability.
    this.bus.on("security.alert", (a) => {
      console.warn(`[security:${a.severity}] ${a.message}`);
    });
  }

  /** Boot the kernel from config (env by default). Generates ephemeral signing keys in dev. */
  static boot(config: OsConfig = loadConfig()): Kernel {
    let kid = config.tokenKeyId;
    let priv = config.tokenPrivateKeyPem;
    let pub = config.tokenPublicKeyPem;
    if (!priv || !pub) {
      if (config.env === "production" || config.env === "staging") {
        throw new Error("token signing keys are required in non-dev environments");
      }
      const kp = generateSigningKeyPair();
      priv = kp.privateKeyPem;
      pub = kp.publicKeyPem;
      kid = "evt-dev-ephemeral";
      console.warn("[kernel] using EPHEMERAL dev signing keys — do not use in prod");
    }
    return new Kernel(config, { kid, priv, pub });
  }

  /** Issue a verifiable capability token for a principal (least-privilege caps). */
  issueTokenFor(principal: Principal, capabilities: string[], audience?: string): string {
    const now = Math.floor(Date.now() / 1000);
    const claims: TokenClaims = {
      sub: principal.id,
      tid: principal.tenantId,
      knd: principal.kind,
      cap: capabilities,
      iat: now,
      exp: now + this.config.tokenTtlSec,
      jti: uuid(),
      ...(audience ? { aud: audience } : {}),
    };
    return issueToken({ keyId: this.tokenKeyId, privateKeyPem: this.tokenPrivateKeyPem }, claims);
  }

  /** Verify a token against the kernel's key set + revocation list. */
  verify(token: string, audience?: string): VerifyResult {
    return verifyToken(token, {
      publicKeys: this.publicKeys,
      revoked: this.revoked,
      ...(audience ? { audience } : {}),
    });
  }

  /** Revoke a token by its jti (immediate, before natural expiry). */
  revoke(jti: string): void {
    this.revoked.add(jti);
  }

  /** Rotate the KMS KEK; new secrets are wrapped under the new version. */
  rotateKms(): string {
    return this.kms.rotate();
  }

  /** The public JWKS-equivalent for external verifiers. */
  publicKeySet(): Record<string, string> {
    return { ...this.publicKeys };
  }
}

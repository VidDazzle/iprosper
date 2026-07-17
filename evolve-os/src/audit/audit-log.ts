import { sha256 } from "../crypto/hashing.js";
import { signMessage, verifyMessage } from "../crypto/signing.js";
import { uuid } from "../crypto/random.js";

/**
 * Tamper-evident audit log.
 *
 * Every entry embeds the hash of the previous entry, forming a hash chain (a
 * lightweight blockchain / Merkle-linked ledger). Any modification, insertion,
 * or deletion of a past entry breaks the chain and is detected by
 * {@link AuditLog.verifyChain}. Entries are optionally Ed25519-signed so an
 * external verifier can prove authenticity without trusting the store.
 */
export interface AuditEvent {
  /** Actor principal id. */
  actor: string;
  tenantId: string;
  /** e.g. "agent.deploy", "auth.token.issue", "policy.deny". */
  action: string;
  /** Target resource id, if any. */
  target?: string;
  /** "allow" | "deny" | "info". */
  outcome: "allow" | "deny" | "info";
  /** Arbitrary structured metadata (must be JSON-serializable). */
  metadata?: Record<string, unknown>;
}

export interface AuditEntry extends AuditEvent {
  readonly seq: number;
  readonly id: string;
  readonly ts: string; // ISO 8601
  readonly prevHash: string;
  readonly hash: string;
  readonly signature?: string;
}

const GENESIS = "0".repeat(64);

export interface AuditSink {
  append(entry: AuditEntry): void | Promise<void>;
}

/** Default in-memory sink. Swap for a durable append-only store in production. */
export class MemoryAuditSink implements AuditSink {
  readonly entries: AuditEntry[] = [];
  append(entry: AuditEntry): void {
    this.entries.push(entry);
  }
}

export interface AuditSigner {
  keyId: string;
  privateKeyPem: string;
}

export class AuditLog {
  private seq = 0;
  private lastHash = GENESIS;

  constructor(
    private readonly sink: AuditSink = new MemoryAuditSink(),
    private readonly signer?: AuditSigner,
  ) {}

  private static computeHash(
    e: Omit<AuditEntry, "hash" | "signature">,
  ): string {
    const canonical = JSON.stringify({
      seq: e.seq,
      id: e.id,
      ts: e.ts,
      actor: e.actor,
      tenantId: e.tenantId,
      action: e.action,
      target: e.target ?? null,
      outcome: e.outcome,
      metadata: e.metadata ?? null,
      prevHash: e.prevHash,
    });
    return sha256(canonical);
  }

  async record(event: AuditEvent): Promise<AuditEntry> {
    const base = {
      ...event,
      seq: this.seq++,
      id: uuid(),
      ts: new Date().toISOString(),
      prevHash: this.lastHash,
    };
    const hash = AuditLog.computeHash(base);
    const signature = this.signer
      ? signMessage(this.signer.privateKeyPem, hash)
      : undefined;
    const entry: AuditEntry = signature
      ? { ...base, hash, signature }
      : { ...base, hash };
    await this.sink.append(entry);
    this.lastHash = hash;
    return entry;
  }

  headHash(): string {
    return this.lastHash;
  }

  /**
   * Snapshot the recorded entries when backed by an in-memory sink. Returns an
   * empty array for sinks that do not retain entries in process.
   */
  snapshot(): AuditEntry[] {
    if (this.sink instanceof MemoryAuditSink) return [...this.sink.entries];
    return [];
  }

  /** Verify the integrity of this log's in-memory entries. */
  verify(signerPublicKeyPem?: string): { ok: boolean; brokenAt?: number; reason?: string } {
    return AuditLog.verifyChain(this.snapshot(), signerPublicKeyPem);
  }

  /**
   * Verify integrity of an ordered list of entries: hash correctness, chain
   * linkage, and (if a public key is given) signatures.
   */
  static verifyChain(
    entries: AuditEntry[],
    signerPublicKeyPem?: string,
  ): { ok: boolean; brokenAt?: number; reason?: string } {
    let prev = GENESIS;
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i]!;
      if (e.prevHash !== prev) {
        return { ok: false, brokenAt: i, reason: "chain linkage broken" };
      }
      const { hash, signature, ...rest } = e;
      const expected = AuditLog.computeHash(rest);
      if (expected !== hash) {
        return { ok: false, brokenAt: i, reason: "hash mismatch (tampered)" };
      }
      if (signerPublicKeyPem) {
        if (!signature || !verifyMessage(signerPublicKeyPem, hash, signature)) {
          return { ok: false, brokenAt: i, reason: "bad or missing signature" };
        }
      }
      prev = hash;
    }
    return { ok: true };
  }
}

import { hkdfSync } from "node:crypto";
import { seal, open, type SealedBox } from "./aead.js";
import { secureRandom } from "./random.js";

/**
 * Key Management Service abstraction.
 *
 * The interface is deliberately small so a production deployment can swap the
 * local software keyring for AWS KMS, GCP KMS, HashiCorp Vault, or an HSM
 * without touching callers. All wrapping/unwrapping of data encryption keys
 * (DEKs) goes through a key-encryption key (KEK) that never leaves the KMS.
 */
export interface Kms {
  /** Wrap (encrypt) a DEK under the active KEK. */
  wrapKey(dek: Buffer, context?: string): Promise<WrappedKey>;
  /** Unwrap (decrypt) a previously wrapped DEK. */
  unwrapKey(wrapped: WrappedKey, context?: string): Promise<Buffer>;
  /** Generate a fresh 256-bit DEK and return it wrapped + in the clear. */
  generateDataKey(context?: string): Promise<{ plaintext: Buffer; wrapped: WrappedKey }>;
  /** Identifier of the currently active KEK version. */
  activeKeyId(): string;
}

export interface WrappedKey {
  readonly keyId: string;
  readonly box: SealedBox;
}

/**
 * Software keyring KMS. Derives per-version KEKs from a single high-entropy
 * root master key using HKDF-SHA-512. Supports rotation: old versions stay
 * available for unwrap while new DEKs are wrapped under the newest version.
 *
 * The root master key MUST come from a secret manager / env, never source code.
 */
export class LocalKeyring implements Kms {
  private readonly keks = new Map<string, Buffer>();
  private active: string;

  private constructor(
    private readonly root: Buffer,
    versions: number,
  ) {
    for (let v = 1; v <= versions; v++) {
      this.keks.set(`kek-v${v}`, this.deriveKek(v));
    }
    this.active = `kek-v${versions}`;
  }

  static fromRootKey(rootKeyBase64: string, versions = 1): LocalKeyring {
    const root = Buffer.from(rootKeyBase64, "base64");
    if (root.length < 32) {
      throw new Error("KMS root key must be >= 32 bytes of entropy");
    }
    if (versions < 1) throw new Error("versions must be >= 1");
    return new LocalKeyring(root, versions);
  }

  /** Create an ephemeral keyring with a random root — for tests / dev only. */
  static ephemeral(): LocalKeyring {
    return LocalKeyring.fromRootKey(secureRandom(32).toString("base64"), 1);
  }

  private deriveKek(version: number): Buffer {
    const info = Buffer.from(`evolve-os/kek/v${version}`, "utf8");
    const salt = Buffer.from("evolve-os-kms", "utf8");
    return Buffer.from(hkdfSync("sha512", this.root, salt, info, 32));
  }

  activeKeyId(): string {
    return this.active;
  }

  /** Add a new KEK version and make it active (rotation). */
  rotate(): string {
    const next = this.keks.size + 1;
    const id = `kek-v${next}`;
    this.keks.set(id, this.deriveKek(next));
    this.active = id;
    return id;
  }

  async wrapKey(dek: Buffer, context = ""): Promise<WrappedKey> {
    const kek = this.keks.get(this.active);
    if (!kek) throw new Error("no active KEK");
    return { keyId: this.active, box: seal(kek, dek, context) };
  }

  async unwrapKey(wrapped: WrappedKey, context = ""): Promise<Buffer> {
    const kek = this.keks.get(wrapped.keyId);
    if (!kek) throw new Error(`unknown KEK version: ${wrapped.keyId}`);
    return open(kek, wrapped.box, context);
  }

  async generateDataKey(
    context = "",
  ): Promise<{ plaintext: Buffer; wrapped: WrappedKey }> {
    const plaintext = secureRandom(32);
    const wrapped = await this.wrapKey(plaintext, context);
    return { plaintext, wrapped };
  }
}

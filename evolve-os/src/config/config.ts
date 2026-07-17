/**
 * Configuration is loaded from the environment only — never hardcoded. Secrets
 * (the KMS root key, signing keys) must come from a secret manager in
 * production. `loadConfig` fails fast with a clear message if a required secret
 * is missing, and will REFUSE to boot with insecure defaults outside dev.
 */
export interface OsConfig {
  env: "development" | "staging" | "production";
  httpPort: number;
  /** Base64 32+ byte KMS root master key. */
  kmsRootKeyBase64: string;
  /** Ed25519 signing keypair (PEM) for verifiable tokens + audit. */
  tokenKeyId: string;
  tokenPrivateKeyPem: string;
  tokenPublicKeyPem: string;
  /** Token lifetime in seconds. */
  tokenTtlSec: number;
  /** Rate limit defaults. */
  rateLimitPerSec: number;
  rateLimitBurst: number;
}

export class ConfigError extends Error {}

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new ConfigError(`missing required env var: ${name}`);
  }
  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): OsConfig {
  const mode = (env.EVOLVE_ENV ?? "development") as OsConfig["env"];
  const isProd = mode === "production" || mode === "staging";

  // In dev, allow ephemeral fallbacks so `npm run dev` works out of the box.
  // In prod/staging, every secret is mandatory.
  const kmsRootKeyBase64 = isProd
    ? required("EVOLVE_KMS_ROOT_KEY", env.EVOLVE_KMS_ROOT_KEY)
    : env.EVOLVE_KMS_ROOT_KEY ?? "";

  const tokenPrivateKeyPem = isProd
    ? required("EVOLVE_TOKEN_PRIVATE_KEY", env.EVOLVE_TOKEN_PRIVATE_KEY)
    : env.EVOLVE_TOKEN_PRIVATE_KEY ?? "";
  const tokenPublicKeyPem = isProd
    ? required("EVOLVE_TOKEN_PUBLIC_KEY", env.EVOLVE_TOKEN_PUBLIC_KEY)
    : env.EVOLVE_TOKEN_PUBLIC_KEY ?? "";

  return {
    env: mode,
    httpPort: Number(env.EVOLVE_PORT ?? 8787),
    kmsRootKeyBase64,
    tokenKeyId: env.EVOLVE_TOKEN_KID ?? "evt-key-1",
    tokenPrivateKeyPem,
    tokenPublicKeyPem,
    tokenTtlSec: Number(env.EVOLVE_TOKEN_TTL_SEC ?? 3600),
    rateLimitPerSec: Number(env.EVOLVE_RATE_PER_SEC ?? 20),
    rateLimitBurst: Number(env.EVOLVE_RATE_BURST ?? 60),
  };
}

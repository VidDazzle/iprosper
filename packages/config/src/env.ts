import { z } from "zod";

// Every field that gates a real-world side effect (spending money,
// contacting a real person, moving live payment data) lives here so
// there is exactly one place that decides whether the system is live.
const envSchema = z.object({
  // Defaults to dry-run. Must be the literal string "true" to go live —
  // anything else (unset, "1", "yes", typos) stays false on purpose.
  LIVE_MODE: z
    .string()
    .optional()
    .transform((v) => v === "true")
    .default(false),

  // Per-channel outbound kill switches, layered under LIVE_MODE — all
  // default false even when LIVE_MODE=true, so going live doesn't
  // silently enable every channel at once. Each must be explicitly
  // flipped on top of LIVE_MODE.
  SMS_ENABLED: z.string().optional().transform((v) => v === "true").default(false),
  VOICE_ENABLED: z.string().optional().transform((v) => v === "true").default(false),
  EMAIL_ENABLED: z.string().optional().transform((v) => v === "true").default(false),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  MAX_COST_PER_PREVIEW: z.coerce.number().positive().default(5),

  PREVIEW_BASE_URL: z.string().default("http://localhost:3000"),

  ANTHROPIC_API_KEY: z.string().optional(),
  AUTH_SECRET: z.string().optional(),
  // Argon2id hash of the admin dashboard password — never the plaintext
  // password itself. Generate with the hashPassword() helper in
  // apps/web/src/lib/adminAuth.ts and set the output here.
  ADMIN_PASSWORD_HASH: z.string().optional(),
  ELEVENLABS_API_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Generic HMAC secrets for the invoicing/affiliate revenue webhooks
  // (Section 8) — no specific provider is named in the spec for either,
  // so these gate a provider-agnostic payload shape pending a real
  // platform choice. See apps/web/src/app/api/webhooks/.
  INVOICING_WEBHOOK_SECRET: z.string().optional(),
  AFFILIATE_WEBHOOK_SECRET: z.string().optional(),

  // Optional generic webhook the weekly Auditor digest POSTs to
  // (Slack incoming webhook, etc.). Unset -> digest is generated and
  // stored, just not delivered anywhere external.
  OWNER_DIGEST_WEBHOOK_URL: z.string().optional(),

  // Self-check heartbeat (not spec-defined): how stale the latest
  // SystemHeartbeat row can be before the admin dashboard flags the
  // apex background process as possibly dead — see packages/health.
  HEARTBEAT_STALE_AFTER_MS: z.coerce.number().positive().default(600000),
});

export type ApexEnv = z.infer<typeof envSchema>;

let cached: ApexEnv | undefined;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): ApexEnv {
  if (cached) return cached;
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(
      `Invalid environment configuration:\n${parsed.error.issues
        .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
        .join("\n")}`,
    );
  }
  cached = parsed.data;
  return cached;
}

// Test-only escape hatch so unit tests can exercise both branches
// without mutating process.env across the whole suite.
export function __resetEnvCacheForTests() {
  cached = undefined;
}

export function isLiveMode(env: NodeJS.ProcessEnv = process.env): boolean {
  return loadEnv(env).LIVE_MODE;
}

/**
 * Guard for anything that would have a real-world side effect
 * (send an SMS/email/call, charge a card, publish content). Call this
 * immediately before that side effect; it throws in dry-run instead of
 * silently no-op'ing, so a caller can't accidentally ship a code path
 * that "works" in dry-run because it forgot this check exists.
 */
export function assertLive(action: string, env: NodeJS.ProcessEnv = process.env): void {
  if (!isLiveMode(env)) {
    throw new DryRunBlockedError(action);
  }
}

export class DryRunBlockedError extends Error {
  constructor(action: string) {
    super(`Blocked in dry-run (LIVE_MODE=false): ${action}`);
    this.name = "DryRunBlockedError";
  }
}

export type Channel = "sms" | "voice" | "email";

/** Per-channel outbound gate: requires LIVE_MODE AND the specific channel's own flag. */
export function isChannelLive(channel: Channel, env: NodeJS.ProcessEnv = process.env): boolean {
  const cfg = loadEnv(env);
  if (!cfg.LIVE_MODE) return false;
  return channel === "sms" ? cfg.SMS_ENABLED : channel === "voice" ? cfg.VOICE_ENABLED : cfg.EMAIL_ENABLED;
}

/**
 * Guard for a specific outbound channel. Throws in dry-run OR when
 * LIVE_MODE is true but that particular channel hasn't been separately
 * enabled — going live never silently enables every channel at once.
 */
export function assertChannelLive(channel: Channel, action: string, env: NodeJS.ProcessEnv = process.env): void {
  if (!isChannelLive(channel, env)) {
    throw new DryRunBlockedError(`[${channel}] ${action}`);
  }
}

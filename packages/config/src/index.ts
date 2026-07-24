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

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  MAX_COST_PER_PREVIEW: z.coerce.number().positive().default(5),

  ANTHROPIC_API_KEY: z.string().optional(),
  AUTH_SECRET: z.string().optional(),
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

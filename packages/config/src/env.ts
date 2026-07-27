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

  // Same layering for the Gemini mock-site pipeline: generation and
  // deployment are two separate real-world side effects (API spend,
  // and — for deploy — a real publicly-hosted site under the
  // prospect's name), so each gets its own switch under LIVE_MODE.
  GEMINI_SITE_ENABLED: z.string().optional().transform((v) => v === "true").default(false),
  NETLIFY_DEPLOY_ENABLED: z.string().optional().transform((v) => v === "true").default(false),

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

  // Gemini mock-site generation, constrained to real BrandKit facts
  // only (see packages/mocksite) — not spec-defined. Model name is a
  // placeholder, flagged the same way every other unverified default
  // in this system is: swap it for whatever Gemini model you actually
  // want once this is smoke-tested against a real key.
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),

  // Per-prospect Netlify hosting for the generated mock site. One
  // pre-created site (NETLIFY_SITE_ID) receives a new non-production
  // deploy per prospect — each deploy gets its own unique preview
  // subdomain from Netlify, so no per-prospect site creation is
  // needed and the account doesn't accumulate one site per prospect.
  NETLIFY_API_KEY: z.string().optional(),
  NETLIFY_SITE_ID: z.string().optional(),

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

  // Autonomous Scout approval (not spec-defined, per explicit
  // decision: "full autonomy with hard caps"). Master switch — false
  // means Scout candidates behave exactly as before this feature
  // existed (always wait for a human in the admin dashboard).
  AUTONOMOUS_APPROVAL_ENABLED: z.string().optional().transform((v) => v === "true").default(false),

  // Ratios, not fixed dollars — explicit decision: "expenses and
  // revenue can fluctuate... profit and revenue should always be
  // expressed in a percentage." Every autonomous cap below is derived
  // from REAL realized unit economics (packages/spend/unitEconomics.ts)
  // once there's enough closed-deal history to trust it
  // (UNIT_ECONOMICS_MIN_SAMPLE). Before that history exists, a small
  // fixed BOOTSTRAP floor applies — the system has to be able to
  // spend something to acquire its first customers before it has any
  // real numbers to compute a percentage from.
  UNIT_ECONOMICS_MIN_SAMPLE: z.coerce.number().int().positive().default(10),

  // Never risk more per autonomous candidate than this fraction of
  // what an average closed deal has actually been worth, once real
  // data exists. Before that, AUTONOMOUS_BOOTSTRAP_DISPATCH_CAP applies.
  AUTONOMOUS_DISPATCH_PERCENT_OF_DEAL_VALUE: z.coerce.number().positive().max(1).default(0.15),
  AUTONOMOUS_BOOTSTRAP_DISPATCH_CAP: z.coerce.number().positive().default(15),

  // Rolling 7-day ceiling on total budgetCap committed via autonomous
  // (not human) approval, as a fraction of the trailing 7-day REALIZED
  // revenue — scales down automatically if revenue drops, scales up as
  // the business actually earns more, rather than needing manual
  // retuning. Floored at AUTONOMOUS_BOOTSTRAP_WEEKLY_CAP so autonomy
  // isn't permanently $0 before the first sale closes.
  AUTONOMOUS_SPEND_PERCENT_OF_REVENUE: z.coerce.number().positive().max(1).default(0.3),
  AUTONOMOUS_BOOTSTRAP_WEEKLY_CAP: z.coerce.number().positive().default(50),

  // The budgetCap PROPOSED in a human-approval-request link, for
  // candidates that don't qualify for autonomous approval (over the
  // weekly cap, or compliance-flagged) — expressed as a multiple of
  // the CURRENT effective per-candidate cap (itself now data-driven),
  // not an independent fixed number. A one-click link can't collect a
  // human-typed number, so the amount is stated up front and committed
  // to on approve.
  AUTONOMOUS_ESCALATION_MULTIPLE: z.coerce.number().positive().default(3),

  // Gross margin this system tries to price toward once it has real
  // cost data — used only to compute a SUGGESTED minimum price shown
  // on the admin dashboard (packages/spend/unitEconomics.ts). Not
  // enforced anywhere yet — nothing in this build sets a client price.
  TARGET_PROFIT_MARGIN_PERCENT: z.coerce.number().positive().max(99).default(50),

  // Where autonomous-approval requests and real-time kill-switch
  // alerts get sent — see packages/ownerAlerts. Unset -> those alerts
  // stay dry-run (logged, not delivered), same as every other channel.
  OWNER_PHONE_NUMBER: z.string().optional(),
  OWNER_EMAIL: z.string().optional(),
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

/** Requires LIVE_MODE AND GEMINI_SITE_ENABLED — separate from Netlify deploy, see packages/mocksite/generate.ts. */
export function isMockSiteGenerationLive(env: NodeJS.ProcessEnv = process.env): boolean {
  const cfg = loadEnv(env);
  return cfg.LIVE_MODE && cfg.GEMINI_SITE_ENABLED;
}

/** Requires LIVE_MODE AND NETLIFY_DEPLOY_ENABLED — this is the step that makes a real, publicly-hosted URL. */
export function isMockSiteDeployLive(env: NodeJS.ProcessEnv = process.env): boolean {
  const cfg = loadEnv(env);
  return cfg.LIVE_MODE && cfg.NETLIFY_DEPLOY_ENABLED;
}

/**
 * Requires LIVE_MODE AND AUTONOMOUS_APPROVAL_ENABLED — the master
 * switch for Scout auto-approving its own candidates (see
 * packages/scout/autonomousApproval.ts). False in dry-run regardless
 * of this flag, same as every other capability in this system: a
 * fresh deploy can never silently start committing autonomous spend.
 */
export function isAutonomousApprovalLive(env: NodeJS.ProcessEnv = process.env): boolean {
  const cfg = loadEnv(env);
  return cfg.LIVE_MODE && cfg.AUTONOMOUS_APPROVAL_ENABLED;
}

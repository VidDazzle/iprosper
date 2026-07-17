/**
 * Agent manifest — the declarative contract every autonomous agent registers
 * with the OS. It is the unit of least privilege: an agent may only touch the
 * connectors and capabilities it declares, and the kernel enforces that at
 * dispatch time. Think of it as the agent's "app manifest" + IAM policy.
 */
export interface AgentManifest {
  /** Stable slug, e.g. "evolve-voice-concierge". */
  name: string;
  version: string;
  displayName: string;
  description: string;
  /** Owning tenant. */
  tenantId: string;
  /** Model/runtime the agent expects, e.g. "claude-fable-5". */
  runtime: string;
  /** Capabilities (permission strings) the agent requests. */
  capabilities: string[];
  /** Connector ids the agent is allowed to invoke. */
  connectors: string[];
  /** Resource ceilings enforced by the orchestrator. */
  limits: AgentLimits;
  /** Whether the agent may run unattended on a schedule. */
  autonomous: boolean;
  /** Free-form labels for routing / discovery. */
  labels?: Record<string, string>;
}

export interface AgentLimits {
  /** Max concurrent tasks. */
  maxConcurrency: number;
  /** Max wall-clock per task in ms. */
  maxTaskDurationMs: number;
  /** Token-bucket rate for outbound connector calls. */
  callsPerSec: number;
  /** Optional monthly spend ceiling in USD cents (0 = unlimited). */
  budgetCentsPerMonth?: number;
}

export const DEFAULT_LIMITS: AgentLimits = {
  maxConcurrency: 4,
  maxTaskDurationMs: 120_000,
  callsPerSec: 5,
  budgetCentsPerMonth: 0,
};

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

const NAME_RE = /^[a-z][a-z0-9-]{1,62}$/;
const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;

/** Validate a manifest before it is admitted to the registry. */
export function validateManifest(m: Partial<AgentManifest>): ValidationResult {
  const errors: string[] = [];
  if (!m.name || !NAME_RE.test(m.name)) {
    errors.push("name must be a lowercase slug (a-z0-9-), 2-63 chars");
  }
  if (!m.version || !SEMVER_RE.test(m.version)) {
    errors.push("version must be semver, e.g. 1.0.0");
  }
  if (!m.tenantId) errors.push("tenantId is required");
  if (!m.runtime) errors.push("runtime is required");
  if (!Array.isArray(m.capabilities)) errors.push("capabilities must be an array");
  if (!Array.isArray(m.connectors)) errors.push("connectors must be an array");
  if (m.limits) {
    if (m.limits.maxConcurrency <= 0) errors.push("limits.maxConcurrency must be > 0");
    if (m.limits.maxTaskDurationMs <= 0) errors.push("limits.maxTaskDurationMs must be > 0");
    if (m.limits.callsPerSec <= 0) errors.push("limits.callsPerSec must be > 0");
  }
  return { ok: errors.length === 0, errors };
}

export function withDefaults(m: AgentManifest): AgentManifest {
  return {
    ...m,
    limits: m.limits ?? DEFAULT_LIMITS,
    autonomous: m.autonomous ?? false,
  };
}

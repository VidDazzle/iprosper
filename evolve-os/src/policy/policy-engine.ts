import type { Principal } from "../identity/principals.js";
import { RbacRegistry } from "../identity/rbac.js";
import { TokenBucketLimiter, type RateLimit } from "./rate-limiter.js";
import {
  assessThreat,
  DEFAULT_THREAT_CONFIG,
  type RequestSignal,
  type ThreatConfig,
  type ThreatVerdict,
} from "./threat-detector.js";

/**
 * Central authorization decision point (PDP). Every privileged action in the
 * OS funnels through {@link PolicyEngine.authorize}, which combines, in order:
 *
 *   1. Rate limiting (token bucket per principal).
 *   2. Threat / bot scoring on the request signal.
 *   3. RBAC permission check for the requested action.
 *   4. Optional custom guardrail predicates (data governance, geo, time-of-day).
 *
 * A single deny anywhere is a deny. The result is fully explainable — every
 * decision returns the reason, which is what gets written to the audit log.
 */
export interface AccessRequest {
  principal: Principal;
  /** Permission being requested, e.g. "agent:deploy". */
  action: string;
  /** Resource id, if applicable. */
  resource?: string;
  signal?: RequestSignal;
  /** Cost for the rate limiter (default 1). */
  cost?: number;
}

export interface Decision {
  allow: boolean;
  reason: string;
  threat?: ThreatVerdict;
  retryAfterMs?: number;
}

export type Guardrail = (req: AccessRequest) => Decision | null;

export interface PolicyEngineOptions {
  rbac?: RbacRegistry;
  rateLimit?: RateLimit;
  threatConfig?: ThreatConfig;
  guardrails?: Guardrail[];
  now?: () => number;
}

export class PolicyEngine {
  private readonly rbac: RbacRegistry;
  private readonly limiter: TokenBucketLimiter;
  private readonly threatConfig: ThreatConfig;
  private readonly guardrails: Guardrail[];

  constructor(opts: PolicyEngineOptions = {}) {
    this.rbac = opts.rbac ?? new RbacRegistry();
    this.limiter = new TokenBucketLimiter(
      opts.rateLimit ?? { ratePerSec: 20, burst: 60 },
      opts.now,
    );
    this.threatConfig = opts.threatConfig ?? DEFAULT_THREAT_CONFIG;
    this.guardrails = opts.guardrails ?? [];
  }

  addGuardrail(g: Guardrail): void {
    this.guardrails.push(g);
  }

  authorize(req: AccessRequest): Decision {
    // 1. Rate limit — keyed by tenant + principal.
    const key = `${req.principal.tenantId}:${req.principal.id}`;
    const rl = this.limiter.take(key, req.cost ?? 1);
    if (!rl.allowed) {
      return {
        allow: false,
        reason: "rate limit exceeded",
        retryAfterMs: rl.retryAfterMs,
      };
    }

    // 2. Threat scoring.
    let threat: ThreatVerdict | undefined;
    if (req.signal) {
      threat = assessThreat(req.signal, this.threatConfig);
      if (threat.action === "block") {
        return {
          allow: false,
          reason: `blocked by threat detector: ${threat.reasons.join(", ")}`,
          threat,
        };
      }
    }

    // 3. RBAC.
    if (!this.rbac.can(req.principal, req.action)) {
      return {
        allow: false,
        reason: `principal lacks permission '${req.action}'`,
        ...(threat ? { threat } : {}),
      };
    }

    // 4. Custom guardrails (first explicit decision wins).
    for (const g of this.guardrails) {
      const d = g(req);
      if (d && !d.allow) return threat ? { ...d, threat } : d;
    }

    return {
      allow: true,
      reason: "authorized",
      ...(threat ? { threat } : {}),
    };
  }
}

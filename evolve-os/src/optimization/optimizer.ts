import type { AgentRegistry } from "../agents/registry.js";
import type { AuditLog } from "../audit/audit-log.js";
import type { MetricsRegistry } from "../observability/metrics.js";
import type { PolicyEngine } from "../policy/policy-engine.js";

/**
 * Self-optimizing controller.
 *
 * A closed-loop controller that reads live metrics and tunes the system toward
 * throughput without sacrificing reliability. It uses an AIMD-style policy
 * (additive increase, multiplicative decrease) — the same family of control law
 * that keeps TCP stable:
 *
 *   - If an agent is reliable (low failure rate) and saturated (work in flight
 *     at its ceiling), raise its concurrency by +1 (additive increase).
 *   - If an agent is failing (high failure rate), halve its concurrency
 *     (multiplicative decrease) to shed load and give it room to recover.
 *
 * All changes stay within per-agent bounds and are written to the audit ledger,
 * so optimization is explainable and reversible.
 */
export interface OptimizerOptions {
  minConcurrency: number;
  maxConcurrency: number;
  /** Failure rate above which we back off. */
  highFailureRate: number;
  /** Failure rate below which we may scale up. */
  lowFailureRate: number;
  /** Minimum completed samples before acting on an agent. */
  minSamples: number;
  intervalMs: number;
}

export const DEFAULT_OPTIMIZER_OPTIONS: OptimizerOptions = {
  minConcurrency: 1,
  maxConcurrency: 64,
  highFailureRate: 0.25,
  lowFailureRate: 0.05,
  minSamples: 10,
  intervalMs: 10_000,
};

export interface OptimizerDeps {
  registry: AgentRegistry;
  metrics: MetricsRegistry;
  audit: AuditLog;
  policy: PolicyEngine;
}

export interface Adjustment {
  agentId: string;
  field: "maxConcurrency";
  from: number;
  to: number;
  reason: string;
}

export class Optimizer {
  private readonly opts: OptimizerOptions;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly deps: OptimizerDeps, opts: Partial<OptimizerOptions> = {}) {
    this.opts = { ...DEFAULT_OPTIMIZER_OPTIONS, ...opts };
  }

  /** Run one optimization pass. Returns the adjustments made. */
  async optimizeOnce(): Promise<Adjustment[]> {
    const adjustments: Adjustment[] = [];
    for (const agentId of this.deps.metrics.agentIds()) {
      const rec = this.deps.registry.get(agentId);
      if (!rec || rec.state !== "deployed") continue;
      const m = this.deps.metrics.forAgent(agentId);
      const samples = m.completed + m.failed;
      if (samples < this.opts.minSamples) continue;

      const failRate = samples === 0 ? 0 : m.failed / samples;
      const cur = rec.manifest.limits.maxConcurrency;
      let next = cur;
      let reason = "";

      if (failRate >= this.opts.highFailureRate) {
        next = Math.max(this.opts.minConcurrency, Math.floor(cur / 2));
        reason = `failure rate ${(failRate * 100).toFixed(0)}% ≥ threshold — multiplicative decrease`;
      } else if (failRate <= this.opts.lowFailureRate && m.inFlight >= cur) {
        next = Math.min(this.opts.maxConcurrency, cur + 1);
        reason = `reliable and saturated (in-flight ${m.inFlight} ≥ ${cur}) — additive increase`;
      }

      if (next !== cur) {
        rec.manifest.limits.maxConcurrency = next;
        const adj: Adjustment = { agentId, field: "maxConcurrency", from: cur, to: next, reason };
        adjustments.push(adj);
        await this.deps.audit.record({
          actor: "system", tenantId: rec.manifest.tenantId,
          action: "optimizer.adjust", target: agentId, outcome: "info",
          metadata: { ...adj },
        });
      }
    }
    return adjustments;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.optimizeOnce(), this.opts.intervalMs);
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

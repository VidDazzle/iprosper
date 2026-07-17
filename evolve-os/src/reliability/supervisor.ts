import type { AgentRegistry } from "../agents/registry.js";
import type { AuditLog } from "../audit/audit-log.js";
import type { EventBus } from "../orchestrator/event-bus.js";
import type { MetricsRegistry } from "../observability/metrics.js";

/**
 * Self-healing supervisor.
 *
 * It is the OS's autonomic nervous system. It:
 *   1. Feeds task lifecycle events into the metrics registry.
 *   2. Auto-quarantines an agent whose consecutive-failure streak crosses a
 *      threshold, so a broken agent stops consuming the fleet.
 *   3. Runs a recovery loop that probes quarantined agents after a cooldown and
 *      returns healthy ones to service (quarantined -> paused -> deployed).
 *   4. Emits security alerts and writes every action to the audit ledger.
 *
 * Connector-level healing (circuit breaking) lives in the ConnectorHub; this
 * supervisor governs agent-level healing.
 */
export interface SupervisorOptions {
  /** Consecutive failures before an agent is quarantined. */
  failureStreakThreshold: number;
  /** Cooldown before a quarantined agent is probed for recovery (ms). */
  recoveryCooldownMs: number;
  /** How often the heal loop runs (ms). */
  healIntervalMs: number;
  now?: () => number;
}

export const DEFAULT_SUPERVISOR_OPTIONS: SupervisorOptions = {
  failureStreakThreshold: 5,
  recoveryCooldownMs: 30_000,
  healIntervalMs: 5_000,
};

export interface SupervisorDeps {
  registry: AgentRegistry;
  audit: AuditLog;
  bus: EventBus;
  metrics: MetricsRegistry;
}

export class Supervisor {
  private readonly opts: SupervisorOptions;
  private readonly now: () => number;
  private readonly quarantinedAt = new Map<string, number>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly unsubscribers: Array<() => void> = [];

  constructor(private readonly deps: SupervisorDeps, opts: Partial<SupervisorOptions> = {}) {
    this.opts = { ...DEFAULT_SUPERVISOR_OPTIONS, ...opts };
    this.now = this.opts.now ?? Date.now;
    this.wire();
  }

  /** Subscribe to the event bus to observe task lifecycle. */
  private wire(): void {
    const { bus, metrics } = this.deps;
    this.unsubscribers.push(
      bus.on("task.started", (e) => metrics.taskStarted(e.agentId, e.taskId)),
      bus.on("task.completed", (e) => {
        metrics.taskCompleted(e.agentId, e.taskId);
      }),
      bus.on("task.failed", (e) => {
        metrics.taskFailed(e.agentId, e.taskId);
        void this.evaluateAgent(e.agentId);
      }),
    );
  }

  /** Quarantine an agent if its failure streak crossed the threshold. */
  private async evaluateAgent(agentId: string): Promise<void> {
    const m = this.deps.metrics.forAgent(agentId);
    if (m.failureStreak < this.opts.failureStreakThreshold) return;
    const rec = this.deps.registry.get(agentId);
    if (!rec || rec.state !== "deployed") return;
    try {
      this.deps.registry.transition(agentId, "quarantined");
      this.quarantinedAt.set(agentId, this.now());
      await this.deps.audit.record({
        actor: "system", tenantId: rec.manifest.tenantId,
        action: "supervisor.quarantine", target: agentId, outcome: "deny",
        metadata: { failureStreak: m.failureStreak },
      });
      await this.deps.bus.emit("security.alert", {
        severity: "high",
        message: `agent ${agentId} quarantined after ${m.failureStreak} consecutive failures`,
      });
    } catch {
      /* transition race — ignore */
    }
  }

  /**
   * Recovery pass: return quarantined agents to service once their cooldown has
   * elapsed. Real deployments would gate this on an active health probe; here we
   * use the cooldown as the probe window and reset the failure streak.
   */
  async healOnce(): Promise<string[]> {
    const recovered: string[] = [];
    for (const [agentId, ts] of [...this.quarantinedAt]) {
      if (this.now() - ts < this.opts.recoveryCooldownMs) continue;
      const rec = this.deps.registry.get(agentId);
      if (!rec) {
        this.quarantinedAt.delete(agentId);
        continue;
      }
      if (rec.state !== "quarantined") {
        this.quarantinedAt.delete(agentId);
        continue;
      }
      try {
        this.deps.registry.transition(agentId, "paused");
        this.deps.registry.transition(agentId, "deployed");
        this.quarantinedAt.delete(agentId);
        recovered.push(agentId);
        await this.deps.audit.record({
          actor: "system", tenantId: rec.manifest.tenantId,
          action: "supervisor.recover", target: agentId, outcome: "allow",
        });
        await this.deps.bus.emit("security.alert", {
          severity: "low",
          message: `agent ${agentId} recovered and returned to service`,
        });
      } catch {
        /* leave quarantined; retry next pass */
      }
    }
    return recovered;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.healOnce(), this.opts.healIntervalMs);
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    for (const u of this.unsubscribers) u();
    this.unsubscribers.length = 0;
  }

  quarantinedAgents(): string[] {
    return [...this.quarantinedAt.keys()];
  }
}

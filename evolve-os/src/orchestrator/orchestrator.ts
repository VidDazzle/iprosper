import type { AgentRegistry } from "../agents/registry.js";
import type { PolicyEngine } from "../policy/policy-engine.js";
import type { AuditLog } from "../audit/audit-log.js";
import type { Principal } from "../identity/principals.js";
import { EventBus } from "./event-bus.js";
import { TaskQueue, type Task } from "./task-queue.js";

/**
 * The execution seam: how a task is actually run. An executor receives the
 * task plus a capability-scoped context and returns a result. Implementations
 * range from "call an LLM agent loop" to "invoke a serverless function" to a
 * sandboxed worker. The orchestrator stays agnostic.
 */
export interface AgentExecutor {
  execute(task: Task, ctx: ExecutionContext): Promise<unknown>;
}

export interface ExecutionContext {
  agentId: string;
  tenantId: string;
  /** Capabilities the agent was granted, for connector gating. */
  capabilities: string[];
  /** Signal that fires when the task exceeds its time budget. */
  signal: AbortSignal;
}

export interface OrchestratorDeps {
  registry: AgentRegistry;
  policy: PolicyEngine;
  audit: AuditLog;
  bus?: EventBus;
  queue?: TaskQueue;
}

/**
 * Coordinates task admission, authorization, concurrency limits, timeouts,
 * retries, and audit. This is the heart of the "autonomous" behavior: agents
 * declare what they can do, the orchestrator enforces it on every dispatch.
 */
export class Orchestrator {
  readonly bus: EventBus;
  readonly queue: TaskQueue;
  private readonly registry: AgentRegistry;
  private readonly policy: PolicyEngine;
  private readonly audit: AuditLog;
  private readonly running = new Map<string, number>(); // agentId -> count
  private draining = false;

  constructor(deps: OrchestratorDeps) {
    this.registry = deps.registry;
    this.policy = deps.policy;
    this.audit = deps.audit;
    this.bus = deps.bus ?? new EventBus();
    this.queue = deps.queue ?? new TaskQueue();
  }

  /** Submit a task on behalf of a principal after an authorization check. */
  async submit(
    principal: Principal,
    agentId: string,
    input: unknown,
    priority = 0,
  ): Promise<Task> {
    const decision = this.policy.authorize({
      principal,
      action: "task:submit",
      resource: agentId,
    });
    if (!decision.allow) {
      await this.audit.record({
        actor: principal.id,
        tenantId: principal.tenantId,
        action: "task.submit",
        target: agentId,
        outcome: "deny",
        metadata: { reason: decision.reason },
      });
      throw new Error(`task submission denied: ${decision.reason}`);
    }
    const agent = this.registry.get(agentId);
    if (!agent) throw new Error(`unknown agent ${agentId}`);
    if (!this.registry.isRunnable(agentId)) {
      throw new Error(`agent ${agentId} is not deployed (state: ${agent.state})`);
    }
    const task = this.queue.submit(agentId, agent.manifest.tenantId, input, {
      priority,
      maxAttempts: 3,
    });
    await this.audit.record({
      actor: principal.id,
      tenantId: principal.tenantId,
      action: "task.submit",
      target: task.id,
      outcome: "allow",
    });
    await this.bus.emit("task.submitted", {
      taskId: task.id,
      agentId,
      tenantId: task.tenantId,
    });
    return task;
  }

  /**
   * Run one dispatch pass: lease and execute as many queued tasks as
   * concurrency limits allow. Returns the number of tasks started. Call this on
   * an interval, or wire it to the "task.submitted" event for push dispatch.
   */
  async tick(executor: AgentExecutor): Promise<number> {
    if (this.draining) return 0;
    let started = 0;
    for (;;) {
      const task = this.queue.lease();
      if (!task) break;
      const agent = this.registry.get(task.agentId);
      if (!agent || !this.registry.isRunnable(task.agentId)) {
        this.queue.fail(task.id, "agent not runnable at dispatch");
        continue;
      }
      const limit = agent.manifest.limits.maxConcurrency;
      const current = this.running.get(task.agentId) ?? 0;
      if (current >= limit) {
        // Put it back; try again next tick.
        this.queue.fail(task.id, "concurrency limit — requeued");
        break;
      }
      void this.runTask(task, agent.manifest.limits.maxTaskDurationMs, agent.manifest.capabilities, executor);
      started++;
    }
    return started;
  }

  private async runTask(
    task: Task,
    timeoutMs: number,
    capabilities: string[],
    executor: AgentExecutor,
  ): Promise<void> {
    this.running.set(task.agentId, (this.running.get(task.agentId) ?? 0) + 1);
    await this.bus.emit("task.started", { taskId: task.id, agentId: task.agentId });
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const result = await executor.execute(task, {
        agentId: task.agentId,
        tenantId: task.tenantId,
        capabilities,
        signal: ac.signal,
      });
      this.queue.complete(task.id, result);
      await this.audit.record({
        actor: task.agentId,
        tenantId: task.tenantId,
        action: "task.complete",
        target: task.id,
        outcome: "allow",
      });
      await this.bus.emit("task.completed", {
        taskId: task.id,
        agentId: task.agentId,
        ok: true,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const updated = this.queue.fail(task.id, message);
      await this.audit.record({
        actor: task.agentId,
        tenantId: task.tenantId,
        action: "task.fail",
        target: task.id,
        outcome: "info",
        metadata: { error: message, state: updated.state },
      });
      await this.bus.emit("task.failed", {
        taskId: task.id,
        agentId: task.agentId,
        error: message,
      });
    } finally {
      clearTimeout(timer);
      this.running.set(task.agentId, Math.max(0, (this.running.get(task.agentId) ?? 1) - 1));
    }
  }

  /** Stop accepting new dispatches (graceful shutdown). */
  drain(): void {
    this.draining = true;
  }
}

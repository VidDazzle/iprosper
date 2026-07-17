import type { AgentRegistry } from "./registry.js";
import type { ConnectorHub } from "../connectors/connector.js";
import type { AgentExecutor, ExecutionContext } from "../orchestrator/orchestrator.js";
import type { Task } from "../orchestrator/task-queue.js";

/**
 * Multi-agent fleet.
 *
 * The orchestrator dispatches a task to an agent *id*; the Fleet maps that to a
 * concrete `ExecutableAgent` (by manifest name) and runs it inside a scoped
 * context. Agents collaborate by delegating to peers through `ctx.delegate`,
 * which re-resolves the peer's own manifest capabilities — so every hop stays
 * least-privilege — and is depth-limited to prevent runaway recursion.
 *
 * This is where "multiple agents" becomes real: register many specialized
 * agents, and let a coordinator compose them.
 */
export interface AgentContext {
  agentId: string;
  tenantId: string;
  capabilities: string[];
  signal: AbortSignal;
  /** Capability-gated connector access. */
  connectors: ConnectorHub;
  /** Delegate to a peer agent by its manifest name; returns its result. */
  delegate(agentName: string, input: unknown): Promise<unknown>;
  /** Current delegation depth (0 for the entry agent). */
  depth: number;
  /** Structured log line (goes to stdout; wire to your logger). */
  log(message: string, extra?: Record<string, unknown>): void;
}

export interface ExecutableAgent {
  /** Must equal the `name` of a registered manifest. */
  readonly name: string;
  handle(input: unknown, ctx: AgentContext): Promise<unknown>;
}

export class FleetError extends Error {}

const MAX_DELEGATION_DEPTH = 5;

export class Fleet implements AgentExecutor {
  private readonly agents = new Map<string, ExecutableAgent>();

  constructor(
    private readonly registry: AgentRegistry,
    private readonly connectors: ConnectorHub,
  ) {}

  register(agent: ExecutableAgent): void {
    this.agents.set(agent.name, agent);
  }

  has(name: string): boolean {
    return this.agents.has(name);
  }

  names(): string[] {
    return [...this.agents.keys()];
  }

  /** AgentExecutor entry point — called by the orchestrator per task. */
  async execute(task: Task, ctx: ExecutionContext): Promise<unknown> {
    const rec = this.registry.get(task.agentId);
    if (!rec) throw new FleetError(`no registry record for ${task.agentId}`);
    return this.run(rec.manifest.name, task.input, {
      agentId: ctx.agentId,
      tenantId: ctx.tenantId,
      capabilities: ctx.capabilities,
      signal: ctx.signal,
    }, 0);
  }

  private async run(
    name: string,
    input: unknown,
    base: { agentId: string; tenantId: string; capabilities: string[]; signal: AbortSignal },
    depth: number,
  ): Promise<unknown> {
    if (depth > MAX_DELEGATION_DEPTH) {
      throw new FleetError(`delegation depth exceeded at '${name}'`);
    }
    const agent = this.agents.get(name);
    if (!agent) throw new FleetError(`no executable agent named '${name}'`);

    const ctx: AgentContext = {
      agentId: base.agentId,
      tenantId: base.tenantId,
      capabilities: base.capabilities,
      signal: base.signal,
      connectors: this.connectors,
      depth,
      log: (message, extra) =>
        console.log(JSON.stringify({ at: new Date().toISOString(), agent: name, message, ...extra })),
      delegate: async (peerName, peerInput) => {
        if (base.signal.aborted) throw new FleetError("aborted");
        // Re-resolve the peer's own least-privilege capabilities.
        const peer = this.registry.getByName(base.tenantId, peerName);
        const caps = peer?.manifest.capabilities ?? [];
        return this.run(peerName, peerInput, { ...base, capabilities: caps }, depth + 1);
      },
    };
    return agent.handle(input, ctx);
  }
}

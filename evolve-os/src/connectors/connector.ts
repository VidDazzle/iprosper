import type { ExecutionContext } from "../orchestrator/orchestrator.js";
import { permissionMatches } from "../identity/rbac.js";
import { CircuitBreaker, type BreakerOptions } from "../reliability/circuit-breaker.js";

/**
 * A Connector is the OS's typed adapter to an external capability — an Evolve
 * service, a third-party API, a database, a voice provider, a payment rail.
 * Agents never call the outside world directly; they call connectors through
 * the ConnectorHub, which enforces capability scoping, timeouts, and audit.
 *
 * This is how "all my services, all my apps" get wired in: implement this
 * interface once per system, register it, and every agent can use it under
 * policy control.
 */
export interface Connector<Input = unknown, Output = unknown> {
  /** Stable id, referenced by agent manifests, e.g. "evolve.voice". */
  readonly id: string;
  readonly displayName: string;
  /** Capability an agent must hold to invoke this connector. */
  readonly requiredCapability: string;
  /** Liveness check used by the kernel health endpoint. */
  health(): Promise<ConnectorHealth>;
  invoke(input: Input, ctx: InvocationContext): Promise<Output>;
}

export interface ConnectorHealth {
  healthy: boolean;
  detail?: string;
}

export interface InvocationContext {
  agentId: string;
  tenantId: string;
  capabilities: string[];
  signal?: AbortSignal;
}

export class ConnectorError extends Error {}

/** Registry + guarded invocation surface for connectors. */
export class ConnectorHub {
  private readonly connectors = new Map<string, Connector>();
  private readonly breakers = new Map<string, CircuitBreaker>();
  private readonly breakerOptions: BreakerOptions;

  constructor(breakerOptions?: Partial<BreakerOptions>) {
    this.breakerOptions = {
      failureThreshold: 5,
      cooldownMs: 15_000,
      ...breakerOptions,
    };
  }

  register(connector: Connector): void {
    if (this.connectors.has(connector.id)) {
      throw new ConnectorError(`connector ${connector.id} already registered`);
    }
    this.connectors.set(connector.id, connector);
    this.breakers.set(connector.id, new CircuitBreaker(connector.id, this.breakerOptions));
  }

  /** Current circuit-breaker state per connector (for the health endpoint). */
  breakerStates(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [id, b] of this.breakers) out[id] = b.status;
    return out;
  }

  get(id: string): Connector | undefined {
    return this.connectors.get(id);
  }

  list(): Connector[] {
    return [...this.connectors.values()];
  }

  /**
   * Invoke a connector on behalf of an agent. Enforces that (a) the connector
   * exists, (b) the agent's manifest allowed this connector via the execution
   * context capabilities, and (c) the required capability is held.
   */
  async invoke<I, O>(
    connectorId: string,
    input: I,
    ctx: ExecutionContext | InvocationContext,
  ): Promise<O> {
    const connector = this.connectors.get(connectorId);
    if (!connector) throw new ConnectorError(`unknown connector ${connectorId}`);

    const held = new Set(ctx.capabilities);
    if (!permissionMatches(held, connector.requiredCapability)) {
      throw new ConnectorError(
        `agent ${ctx.agentId} lacks capability '${connector.requiredCapability}' for ${connectorId}`,
      );
    }
    const invocationCtx: InvocationContext = {
      agentId: ctx.agentId,
      tenantId: ctx.tenantId,
      capabilities: ctx.capabilities,
      ...("signal" in ctx && ctx.signal ? { signal: ctx.signal } : {}),
    };
    // Route through the circuit breaker so a failing dependency is isolated
    // (fail-fast when open) and auto-probed for recovery after cooldown.
    const breaker = this.breakers.get(connectorId)!;
    return breaker.execute(() => connector.invoke(input, invocationCtx)) as Promise<O>;
  }

  async healthAll(): Promise<Record<string, ConnectorHealth>> {
    const out: Record<string, ConnectorHealth> = {};
    await Promise.all(
      this.list().map(async (c) => {
        try {
          out[c.id] = await c.health();
        } catch (err) {
          out[c.id] = {
            healthy: false,
            detail: err instanceof Error ? err.message : String(err),
          };
        }
      }),
    );
    return out;
  }
}

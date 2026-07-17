/**
 * Circuit breaker. Wraps a fallible operation (typically a connector call) so a
 * failing dependency is isolated instead of cascading. States:
 *   - closed:    calls flow; failures counted.
 *   - open:      calls fail fast; after cooldown -> half-open.
 *   - half-open: a limited probe is allowed; success -> closed, failure -> open.
 */
export type BreakerState = "closed" | "open" | "half-open";

export interface BreakerOptions {
  failureThreshold: number; // consecutive failures to trip
  cooldownMs: number; // time before probing again
  now?: () => number;
}

export class CircuitBreaker {
  private state: BreakerState = "closed";
  private failures = 0;
  private openedAt = 0;
  private readonly now: () => number;

  constructor(
    private readonly name: string,
    private readonly opts: BreakerOptions,
  ) {
    this.now = opts.now ?? Date.now;
  }

  get status(): BreakerState {
    this.maybeHalfOpen();
    return this.state;
  }

  private maybeHalfOpen(): void {
    if (this.state === "open" && this.now() - this.openedAt >= this.opts.cooldownMs) {
      this.state = "half-open";
    }
  }

  private trip(): void {
    this.state = "open";
    this.openedAt = this.now();
  }

  private reset(): void {
    this.state = "closed";
    this.failures = 0;
  }

  async execute<T>(op: () => Promise<T>): Promise<T> {
    this.maybeHalfOpen();
    if (this.state === "open") {
      throw new CircuitOpenError(`circuit '${this.name}' is open`);
    }
    try {
      const result = await op();
      if (this.state === "half-open") this.reset();
      else this.failures = 0;
      return result;
    } catch (err) {
      this.failures++;
      if (this.state === "half-open" || this.failures >= this.opts.failureThreshold) {
        this.trip();
      }
      throw err;
    }
  }

  /** Manually force closed (used by the supervisor after a healthy probe). */
  forceClose(): void {
    this.reset();
  }
}

export class CircuitOpenError extends Error {}

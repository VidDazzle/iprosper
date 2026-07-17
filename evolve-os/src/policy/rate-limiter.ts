/**
 * Token-bucket rate limiter. Each key (principal, IP, connector) gets a bucket
 * that refills continuously at `ratePerSec` up to `burst`. This smooths bursts
 * while capping sustained throughput — the first line of defense against
 * scripted abuse and runaway agents.
 */
interface Bucket {
  tokens: number;
  last: number;
}

export interface RateLimit {
  ratePerSec: number;
  burst: number;
}

export class TokenBucketLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly limit: RateLimit,
    private readonly now: () => number = Date.now,
  ) {}

  /** Attempt to consume `cost` tokens. Returns allow + retry hint. */
  take(key: string, cost = 1): { allowed: boolean; retryAfterMs: number } {
    const t = this.now();
    let b = this.buckets.get(key);
    if (!b) {
      b = { tokens: this.limit.burst, last: t };
      this.buckets.set(key, b);
    }
    const elapsedSec = (t - b.last) / 1000;
    b.tokens = Math.min(this.limit.burst, b.tokens + elapsedSec * this.limit.ratePerSec);
    b.last = t;
    if (b.tokens >= cost) {
      b.tokens -= cost;
      return { allowed: true, retryAfterMs: 0 };
    }
    const deficit = cost - b.tokens;
    return {
      allowed: false,
      retryAfterMs: Math.ceil((deficit / this.limit.ratePerSec) * 1000),
    };
  }

  /** Drop idle buckets to bound memory (call periodically). */
  sweep(maxIdleMs = 5 * 60_000): void {
    const t = this.now();
    for (const [k, b] of this.buckets) {
      if (t - b.last > maxIdleMs) this.buckets.delete(k);
    }
  }
}

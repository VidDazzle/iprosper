import { childLogger } from "./logger.js";

const log = childLogger("queue");

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
}

/**
 * Runs an async task with exponential backoff. Used to wrap every network
 * call that touches a third-party platform/creative API so transient
 * failures (rate limits, timeouts) don't take down the autonomous loop.
 */
export async function withRetry<T>(
  label: string,
  task: () => Promise<T>,
  opts: RetryOptions = { maxAttempts: 3, baseDelayMs: 2000 }
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await task();
    } catch (err) {
      lastError = err;
      log.warn({ label, attempt, err: err instanceof Error ? err.message : err }, "task attempt failed");
      if (attempt < opts.maxAttempts) {
        const delay = opts.baseDelayMs * 2 ** (attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

/** Simple in-process concurrency limiter so we don't hammer every platform API at once. */
export class ConcurrencyLimiter {
  private active = 0;
  private queue: (() => void)[] = [];

  constructor(private limit: number) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.active++;
    try {
      return await task();
    } finally {
      this.active--;
      this.queue.shift()?.();
    }
  }
}

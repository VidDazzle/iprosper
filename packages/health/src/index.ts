import { prisma } from "@apex/db";
import { getRedisConnection } from "@apex/queue";
import { loadEnv } from "@apex/config";

export interface CheckResult {
  ok: boolean;
  latencyMs: number;
  error?: string;
}

export interface HeartbeatChecks {
  db: CheckResult;
  redis: CheckResult;
}

// getRedisConnection() is configured with maxRetriesPerRequest: null
// (required so BullMQ workers don't drop jobs on a transient
// reconnect) — which also means a command issued while disconnected
// queues silently and waits for reconnection instead of erroring. A
// health check that can hang forever is worse than no health check at
// all, so every check gets its own hard timeout independent of the
// underlying client's retry behavior.
export const CHECK_TIMEOUT_MS = 3000;

export async function timeCheck(fn: () => Promise<void>): Promise<CheckResult> {
  const start = Date.now();
  try {
    await Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`check timed out after ${CHECK_TIMEOUT_MS}ms`)), CHECK_TIMEOUT_MS),
      ),
    ]);
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function checkDb(): Promise<CheckResult> {
  return timeCheck(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });
}

export async function checkRedis(): Promise<CheckResult> {
  return timeCheck(async () => {
    const pong = await getRedisConnection().ping();
    if (pong !== "PONG") throw new Error(`unexpected redis PING response: "${pong}"`);
  });
}

export async function runAllChecks(): Promise<HeartbeatChecks> {
  const [db, redis] = await Promise.all([checkDb(), checkRedis()]);
  return { db, redis };
}

export function statusFromChecks(checks: HeartbeatChecks): "ok" | "degraded" {
  return checks.db.ok && checks.redis.ok ? "ok" : "degraded";
}

/**
 * Self-check heartbeat: not in the original 11-section spec. Added
 * because the kill-switch/sweeper crons only detect stalled *jobs* —
 * nothing previously detected the apex background process (the cron
 * scheduler itself) dying silently while apps/web kept serving stale
 * data. Runs the live DB/Redis checks and persists the result so
 * staleness is visible after the fact, not just at request time.
 */
export async function runHeartbeat() {
  const checks = await runAllChecks();
  const status = statusFromChecks(checks);
  return prisma.systemHeartbeat.create({ data: { status, checks: checks as never } });
}

export async function getLatestHeartbeat() {
  return prisma.systemHeartbeat.findFirst({ orderBy: { createdAt: "desc" } });
}

/** Pure predicate, split out for unit testing: no heartbeat ever recorded, or the latest one is older than the threshold. */
export function isHeartbeatStale(latest: { createdAt: Date } | null, now: Date, staleAfterMs: number): boolean {
  if (!latest) return true;
  return now.getTime() - latest.createdAt.getTime() > staleAfterMs;
}

/** Env-overridable placeholder, not spec-defined — see .env.example. Default gives 2x margin over the 5-minute cron cadence. */
export function heartbeatStaleAfterMs(): number {
  return loadEnv().HEARTBEAT_STALE_AFTER_MS;
}

import { describe, it, expect } from "vitest";
import { isHeartbeatStale, statusFromChecks, timeCheck, CHECK_TIMEOUT_MS } from "../src/index.js";

describe("timeCheck", () => {
  it("reports ok for a function that resolves", async () => {
    const result = await timeCheck(async () => {});
    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("reports the rejection error for a function that throws", async () => {
    const result = await timeCheck(async () => {
      throw new Error("ECONNREFUSED");
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("ECONNREFUSED");
  });

  it("times out instead of hanging forever on a function that never resolves", async () => {
    // Regression test: getRedisConnection() is configured with
    // maxRetriesPerRequest: null, so a command issued while
    // disconnected queues silently and never rejects on its own —
    // without its own timeout, timeCheck would hang forever too.
    const neverResolves = () => new Promise<void>(() => {});
    const start = Date.now();
    const result = await timeCheck(neverResolves);
    const elapsed = Date.now() - start;

    expect(result.ok).toBe(false);
    expect(result.error).toContain("timed out");
    expect(elapsed).toBeLessThan(CHECK_TIMEOUT_MS + 1000);
  }, CHECK_TIMEOUT_MS + 2000);
});

describe("statusFromChecks", () => {
  it("is 'ok' when both db and redis are ok", () => {
    const status = statusFromChecks({
      db: { ok: true, latencyMs: 5 },
      redis: { ok: true, latencyMs: 2 },
    });
    expect(status).toBe("ok");
  });

  it("is 'degraded' when either check fails", () => {
    expect(
      statusFromChecks({
        db: { ok: false, latencyMs: 5, error: "connection refused" },
        redis: { ok: true, latencyMs: 2 },
      }),
    ).toBe("degraded");

    expect(
      statusFromChecks({
        db: { ok: true, latencyMs: 5 },
        redis: { ok: false, latencyMs: 2, error: "ECONNREFUSED" },
      }),
    ).toBe("degraded");
  });
});

describe("isHeartbeatStale", () => {
  const now = new Date("2026-07-24T12:00:00Z");

  it("is stale when no heartbeat has ever been recorded", () => {
    expect(isHeartbeatStale(null, now, 600000)).toBe(true);
  });

  it("is not stale when the latest heartbeat is within the threshold", () => {
    const latest = { createdAt: new Date(now.getTime() - 5 * 60 * 1000) };
    expect(isHeartbeatStale(latest, now, 600000)).toBe(false);
  });

  it("is stale when the latest heartbeat is older than the threshold", () => {
    const latest = { createdAt: new Date(now.getTime() - 11 * 60 * 1000) };
    expect(isHeartbeatStale(latest, now, 600000)).toBe(true);
  });
});

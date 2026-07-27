import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { runHeartbeat, getLatestHeartbeat, checkDb, checkRedis } from "../src/index.js";
import { resetDb, teardown } from "./helpers.js";

beforeEach(resetDb);
afterAll(teardown);

describe("checkDb / checkRedis", () => {
  it("reports ok against the real dev database and redis", async () => {
    const db = await checkDb();
    expect(db.ok).toBe(true);
    expect(db.error).toBeUndefined();

    const redis = await checkRedis();
    expect(redis.ok).toBe(true);
    expect(redis.error).toBeUndefined();
  });
});

describe("runHeartbeat", () => {
  it("persists an 'ok' row when both checks pass", async () => {
    const row = await runHeartbeat();
    expect(row.status).toBe("ok");

    const latest = await getLatestHeartbeat();
    expect(latest?.id).toBe(row.id);
  });

  it("getLatestHeartbeat returns the most recently created row", async () => {
    const first = await runHeartbeat();
    const second = await runHeartbeat();

    const latest = await getLatestHeartbeat();
    expect(latest?.id).toBe(second.id);
    expect(latest?.id).not.toBe(first.id);
  });
});

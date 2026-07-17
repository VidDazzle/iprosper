import { test } from "node:test";
import assert from "node:assert/strict";
import { CircuitBreaker, CircuitOpenError } from "../src/reliability/circuit-breaker.js";
import { Supervisor } from "../src/reliability/supervisor.js";
import { AgentRegistry } from "../src/agents/registry.js";
import { AuditLog } from "../src/audit/audit-log.js";
import { EventBus } from "../src/orchestrator/event-bus.js";
import { MetricsRegistry } from "../src/observability/metrics.js";
import type { AgentManifest } from "../src/agents/manifest.js";

test("circuit breaker trips, fails fast, then half-opens and recovers", async () => {
  let now = 0;
  const cb = new CircuitBreaker("dep", { failureThreshold: 2, cooldownMs: 1000, now: () => now });
  const boom = async (): Promise<number> => { throw new Error("fail"); };
  await assert.rejects(cb.execute(boom));
  await assert.rejects(cb.execute(boom));
  assert.equal(cb.status, "open");
  // Open => fast fail without calling op.
  await assert.rejects(cb.execute(async () => 1), (e) => e instanceof CircuitOpenError);
  now += 1000; // cooldown elapsed -> half-open
  assert.equal(cb.status, "half-open");
  const ok = await cb.execute(async () => 42);
  assert.equal(ok, 42);
  assert.equal(cb.status, "closed");
});

function deployedAgent(registry: AgentRegistry): string {
  const manifest: AgentManifest = {
    name: "flaky", version: "1.0.0", displayName: "Flaky", description: "d",
    tenantId: "evolve", runtime: "claude-fable-5",
    capabilities: ["connector:invoke"], connectors: [],
    limits: { maxConcurrency: 2, maxTaskDurationMs: 5000, callsPerSec: 5 }, autonomous: true,
  };
  const rec = registry.register(manifest);
  registry.transition(rec.id, "reviewing");
  registry.transition(rec.id, "approved");
  registry.transition(rec.id, "deployed");
  return rec.id;
}

test("supervisor quarantines an agent after a failure streak, then recovers it", async () => {
  let now = 0;
  const registry = new AgentRegistry();
  const audit = new AuditLog();
  const bus = new EventBus();
  const metrics = new MetricsRegistry();
  const sup = new Supervisor(
    { registry, audit, bus, metrics },
    { failureStreakThreshold: 3, recoveryCooldownMs: 1000, healIntervalMs: 999999, now: () => now },
  );
  const id = deployedAgent(registry);

  // Drive three consecutive failures through the bus.
  for (let i = 0; i < 3; i++) {
    await bus.emit("task.started", { taskId: `t${i}`, agentId: id });
    await bus.emit("task.failed", { taskId: `t${i}`, agentId: id, error: "boom" });
  }
  assert.equal(registry.get(id)!.state, "quarantined");
  assert.deepEqual(sup.quarantinedAgents(), [id]);

  // Before cooldown: no recovery.
  assert.deepEqual(await sup.healOnce(), []);
  now += 1000; // cooldown elapsed
  const recovered = await sup.healOnce();
  assert.deepEqual(recovered, [id]);
  assert.equal(registry.get(id)!.state, "deployed");
  sup.stop();
});

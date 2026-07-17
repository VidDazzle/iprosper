import { test } from "node:test";
import assert from "node:assert/strict";
import { MetricsRegistry } from "../src/observability/metrics.js";
import { Optimizer } from "../src/optimization/optimizer.js";
import { AgentRegistry } from "../src/agents/registry.js";
import { AuditLog } from "../src/audit/audit-log.js";
import { PolicyEngine } from "../src/policy/policy-engine.js";
import { Kernel } from "../src/kernel/kernel.js";
import { installDefaultFleet } from "../src/bootstrap.js";
import type { AgentManifest } from "../src/agents/manifest.js";
import type { Principal } from "../src/identity/principals.js";

function devKernel(): Kernel {
  return Kernel.boot({
    env: "development", httpPort: 0, kmsRootKeyBase64: "",
    tokenKeyId: "t", tokenPrivateKeyPem: "", tokenPublicKeyPem: "",
    tokenTtlSec: 3600, rateLimitPerSec: 1000, rateLimitBurst: 1000,
  });
}

function deployAgent(registry: AgentRegistry, concurrency: number): string {
  const manifest: AgentManifest = {
    name: "worker", version: "1.0.0", displayName: "W", description: "d",
    tenantId: "evolve", runtime: "claude-fable-5",
    capabilities: [], connectors: [],
    limits: { maxConcurrency: concurrency, maxTaskDurationMs: 5000, callsPerSec: 5 }, autonomous: true,
  };
  const rec = registry.register(manifest);
  registry.transition(rec.id, "reviewing");
  registry.transition(rec.id, "approved");
  registry.transition(rec.id, "deployed");
  return rec.id;
}

test("metrics track streaks and latency", () => {
  const m = new MetricsRegistry();
  m.taskStarted("a", "t1", 0);
  m.taskCompleted("a", "t1", 100);
  m.taskStarted("a", "t2", 0);
  m.taskFailed("a", "t2", 50);
  const am = m.forAgent("a");
  assert.equal(am.completed, 1);
  assert.equal(am.failed, 1);
  assert.equal(am.failureStreak, 1);
  assert.equal(am.latency.count, 2);
  assert.equal(am.latency.max, 100);
});

test("optimizer scales up a reliable, saturated agent (additive increase)", async () => {
  const registry = new AgentRegistry();
  const metrics = new MetricsRegistry();
  const opt = new Optimizer(
    { registry, metrics, audit: new AuditLog(), policy: new PolicyEngine() },
    { minSamples: 10 },
  );
  const id = deployAgent(registry, 2);
  // 12 clean completions -> low failure rate, enough samples.
  for (let i = 0; i < 12; i++) { metrics.taskStarted(id, `c${i}`, 0); metrics.taskCompleted(id, `c${i}`, 10); }
  // 2 in-flight to reach saturation (inFlight >= maxConcurrency 2).
  metrics.taskStarted(id, "x1", 0);
  metrics.taskStarted(id, "x2", 0);
  const adjustments = await opt.optimizeOnce();
  assert.equal(adjustments.length, 1);
  assert.equal(registry.get(id)!.manifest.limits.maxConcurrency, 3);
});

test("optimizer backs off a failing agent (multiplicative decrease)", async () => {
  const registry = new AgentRegistry();
  const metrics = new MetricsRegistry();
  const opt = new Optimizer(
    { registry, metrics, audit: new AuditLog(), policy: new PolicyEngine() },
    { minSamples: 10 },
  );
  const id = deployAgent(registry, 4);
  for (let i = 0; i < 6; i++) { metrics.taskStarted(id, `f${i}`, 0); metrics.taskFailed(id, `f${i}`, 10); }
  for (let i = 0; i < 6; i++) { metrics.taskStarted(id, `c${i}`, 0); metrics.taskCompleted(id, `c${i}`, 10); }
  const adjustments = await opt.optimizeOnce();
  assert.equal(adjustments.length, 1);
  assert.equal(registry.get(id)!.manifest.limits.maxConcurrency, 2); // floor(4/2)
});

test("multi-agent fleet: coordinator delegates to intent + responder", async () => {
  const kernel = devKernel();
  installDefaultFleet(kernel);
  const owner: Principal = {
    id: "owner", kind: "human", displayName: "O", tenantId: "evolve", roles: ["owner"],
  };
  const coordinator = kernel.registry.getByName("evolve", "evolve-coordinator")!;
  const task = await kernel.orchestrator.submit(owner, coordinator.id, {
    text: "I want to book a demo", speak: true,
  });
  await kernel.orchestrator.tick(kernel.fleet);
  await new Promise((r) => setTimeout(r, 60));
  const done = kernel.orchestrator.queue.get(task.id)!;
  assert.equal(done.state, "completed");
  const result = done.result as { intent: string; reply: string; voice?: unknown };
  assert.equal(result.intent, "book_demo");
  assert.ok(result.reply.length > 0);
  assert.ok(result.voice, "coordinator should have delegated to the voice agent");
  kernel.stopSelfManagement();
});

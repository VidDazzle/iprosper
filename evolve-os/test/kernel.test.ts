import { test } from "node:test";
import assert from "node:assert/strict";
import { Kernel } from "../src/kernel/kernel.js";
import { EvolveVoiceConnector } from "../src/connectors/builtin.js";
import type { Principal } from "../src/identity/principals.js";
import type { AgentExecutor, ExecutionContext } from "../src/orchestrator/orchestrator.js";
import type { Task } from "../src/orchestrator/task-queue.js";

function bootKernel(): Kernel {
  return Kernel.boot({
    env: "development",
    httpPort: 0,
    kmsRootKeyBase64: "",
    tokenKeyId: "test",
    tokenPrivateKeyPem: "",
    tokenPublicKeyPem: "",
    tokenTtlSec: 3600,
    rateLimitPerSec: 1000,
    rateLimitBurst: 1000,
  });
}

const owner: Principal = {
  id: "owner", kind: "human", displayName: "Owner", tenantId: "evolve", roles: ["owner"],
};

test("token issue + verify round-trips; tampered token rejected", () => {
  const k = bootKernel();
  const token = k.issueTokenFor(owner, ["agent:read"]);
  const ok = k.verify(token);
  assert.ok(ok.ok && ok.claims.sub === "owner");

  const tampered = token.slice(0, -3) + "aaa";
  assert.equal(k.verify(tampered).ok, false);
});

test("revoked token is rejected", () => {
  const k = bootKernel();
  const token = k.issueTokenFor(owner, ["agent:read"]);
  const res = k.verify(token);
  assert.ok(res.ok);
  if (res.ok) k.revoke(res.claims.jti);
  assert.equal(k.verify(token).ok, false);
});

test("agent lifecycle enforces legal transitions", () => {
  const k = bootKernel();
  const rec = k.registry.register({
    name: "test-agent", version: "1.0.0", displayName: "T", description: "d",
    tenantId: "evolve", runtime: "claude-fable-5",
    capabilities: ["connector:invoke"], connectors: ["evolve.voice"],
    limits: { maxConcurrency: 1, maxTaskDurationMs: 5000, callsPerSec: 5 },
    autonomous: false,
  });
  assert.equal(rec.state, "registered");
  assert.throws(() => k.registry.transition(rec.id, "deployed")); // must review first
  k.registry.transition(rec.id, "reviewing");
  k.registry.transition(rec.id, "approved");
  k.registry.transition(rec.id, "deployed");
  assert.ok(k.registry.isRunnable(rec.id));
});

test("orchestrator runs a task through a connector", async () => {
  const k = bootKernel();
  k.connectors.register(new EvolveVoiceConnector());
  const rec = k.registry.register({
    name: "voice", version: "1.0.0", displayName: "V", description: "d",
    tenantId: "evolve", runtime: "claude-fable-5",
    capabilities: ["connector:invoke"], connectors: ["evolve.voice"],
    limits: { maxConcurrency: 2, maxTaskDurationMs: 5000, callsPerSec: 5 },
    autonomous: true,
  });
  k.registry.transition(rec.id, "reviewing");
  k.registry.transition(rec.id, "approved");
  k.registry.transition(rec.id, "deployed");

  const executor: AgentExecutor = {
    async execute(task: Task, ctx: ExecutionContext) {
      const input = task.input as { utterance: string };
      return k.connectors.invoke("evolve.voice", { utterance: input.utterance }, ctx);
    },
  };

  const task = await k.orchestrator.submit(owner, rec.id, { utterance: "hi" });
  await k.orchestrator.tick(executor);
  await new Promise((r) => setTimeout(r, 50));
  const done = k.orchestrator.queue.get(task.id);
  assert.equal(done?.state, "completed");
  assert.ok(k.audit.verify(Object.values(k.publicKeySet())[0]).ok);
});

test("connector invocation denied without capability", async () => {
  const k = bootKernel();
  k.connectors.register(new EvolveVoiceConnector());
  await assert.rejects(
    k.connectors.invoke("evolve.voice", { utterance: "x" }, {
      agentId: "a", tenantId: "evolve", capabilities: [], // no connector:invoke
    }),
  );
});

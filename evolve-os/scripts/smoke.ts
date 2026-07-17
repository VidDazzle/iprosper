/**
 * End-to-end smoke test with no HTTP layer: boot the kernel, register + deploy
 * an agent, submit a task, run a dispatch tick, and verify the audit chain.
 *
 *   node --experimental-strip-types scripts/smoke.ts
 */
import { Kernel } from "../src/kernel/kernel.js";
import { EvolveVoiceConnector } from "../src/connectors/builtin.js";
import type { Principal } from "../src/identity/principals.js";
import type { AgentExecutor, ExecutionContext } from "../src/orchestrator/orchestrator.js";
import type { Task } from "../src/orchestrator/task-queue.js";

const kernel = Kernel.boot();
kernel.connectors.register(new EvolveVoiceConnector());

const owner: Principal = {
  id: "owner-1",
  kind: "human",
  displayName: "Owner",
  tenantId: "evolve",
  roles: ["owner"],
};

const rec = kernel.registry.register({
  name: "evolve-voice-concierge",
  version: "1.0.0",
  displayName: "Voice Concierge",
  description: "Handles inbound voice turns.",
  tenantId: "evolve",
  runtime: "claude-fable-5",
  capabilities: ["task:read", "task:complete", "connector:invoke"],
  connectors: ["evolve.voice"],
  limits: { maxConcurrency: 2, maxTaskDurationMs: 10_000, callsPerSec: 5 },
  autonomous: true,
});
kernel.registry.transition(rec.id, "reviewing");
kernel.registry.transition(rec.id, "approved");
kernel.registry.transition(rec.id, "deployed");
console.log(`✓ agent ${rec.manifest.name} deployed (${rec.id})`);

const executor: AgentExecutor = {
  async execute(task: Task, ctx: ExecutionContext) {
    const input = task.input as { utterance?: string };
    if (input?.utterance) {
      return kernel.connectors.invoke("evolve.voice", { utterance: input.utterance }, ctx);
    }
    return { echoed: task.input };
  },
};

const task = await kernel.orchestrator.submit(owner, rec.id, { utterance: "Book me a demo" });
console.log(`✓ task submitted (${task.id})`);

await kernel.orchestrator.tick(executor);
await new Promise((r) => setTimeout(r, 100));

const done = kernel.orchestrator.queue.get(task.id)!;
console.log(`✓ task state: ${done.state}`);
console.log(`  result:`, JSON.stringify(done.result));

const audit = kernel.audit.verify(Object.values(kernel.publicKeySet())[0]);
console.log(`✓ audit chain: ${audit.ok ? "INTACT" : "BROKEN @ " + audit.brokenAt}`);
console.log(`  entries: ${kernel.audit.snapshot().length}`);

// Token round-trip.
const token = kernel.issueTokenFor(owner, ["agent:read"]);
const verified = kernel.verify(token);
console.log(`✓ token verify: ${verified.ok ? "valid" : verified.reason}`);

if (!audit.ok || done.state !== "completed" || !verified.ok) {
  console.error("✗ smoke test FAILED");
  process.exit(1);
}
console.log("\nAll smoke checks passed.");

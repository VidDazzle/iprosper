import type { Kernel } from "./kernel/kernel.js";
import { EvolveVoiceConnector } from "./connectors/builtin.js";
import { defaultAgents } from "./agents/builtin-agents.js";
import { DEFAULT_LIMITS, type AgentManifest } from "./agents/manifest.js";

/**
 * Install the reference multi-agent fleet into a kernel: register the voice
 * connector, then for each executable agent register a matching manifest, add
 * it to the fleet, and deploy it. Idempotent per process.
 */
export function installDefaultFleet(kernel: Kernel, tenantId = process.env.EVOLVE_TENANT ?? "evolve"): void {
  if (!kernel.connectors.get("evolve.voice")) {
    kernel.connectors.register(new EvolveVoiceConnector());
  }

  for (const agent of defaultAgents()) {
    if (kernel.fleet.has(agent.name)) continue;
    kernel.fleet.register(agent);

    if (kernel.registry.getByName(tenantId, agent.name)) continue;
    const manifest: AgentManifest = {
      name: agent.name,
      version: "1.0.0",
      displayName: agent.name,
      description: `Reference fleet agent: ${agent.name}`,
      tenantId,
      runtime: "claude-fable-5",
      capabilities: ["task:read", "task:complete", "connector:invoke"],
      connectors: ["evolve.voice"],
      limits: { ...DEFAULT_LIMITS },
      autonomous: true,
    };
    const rec = kernel.registry.register(manifest);
    kernel.registry.transition(rec.id, "reviewing");
    kernel.registry.transition(rec.id, "approved");
    kernel.registry.transition(rec.id, "deployed");
  }
}

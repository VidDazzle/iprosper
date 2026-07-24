import { prisma } from "@apex/db";
import type { Engine } from "@apex/contracts";

export async function ensureAgent(agentId: string, engine: Engine) {
  return prisma.agent.upsert({
    where: { id: agentId },
    update: {},
    create: { id: agentId, engine, status: "active" },
  });
}

export class AgentKilledError extends Error {
  constructor(agentId: string) {
    super(`Agent "${agentId}" is killed and cannot accept new dispatches.`);
    this.name = "AgentKilledError";
  }
}

export async function assertAgentActive(agentId: string) {
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (agent?.status === "killed") {
    throw new AgentKilledError(agentId);
  }
}

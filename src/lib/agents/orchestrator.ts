/**
 * Orchestrator — routes every client interaction to the right specialist
 * agent and enforces the compliance layer around each handoff.
 *
 * Flow: inbound contact (voice/SMS/email) → Echo establishes the session and
 * consent → orchestrator selects the specialist by client phase and intent →
 * Sentinel screens each outbound action → escalation rules can reroute or
 * halt at any point.
 */

import type { AgentDefinition, AgentId, Channel, ClientPhase, HandoffContext } from "./types";
import { AGENT_MAP } from "./registry";
import { PHASE_PERMISSIONS, withinCallingHours, isServiceableState } from "./compliance";

/** Default specialist per client phase when no intent overrides it. */
const PHASE_DEFAULT_AGENT: Record<ClientPhase, AgentId> = {
  prospect: "aria",
  intake: "aria",
  "enrolled-saving": "sage",
  negotiating: "sage",
  settling: "ledger",
  graduated: "sage",
  withdrawn: "sage",
};

/** Intent keywords that override the phase default. */
const INTENT_ROUTES: Array<{ pattern: RegExp; agent: AgentId }> = [
  { pattern: /(sued|lawsuit|summons|court|garnish|attorney|legal)/i, agent: "guardian" },
  { pattern: /(deposit|withdraw|account balance|payment|fee|refund)/i, agent: "ledger" },
  { pattern: /(settle|negotiat|offer|creditor called)/i, agent: "nova" },
  { pattern: /(credit score|credit report|collection notice)/i, agent: "sage" }, // Pulse is internal; Sage fronts its data
  { pattern: /(enroll|sign up|qualify|new debt|add a debt)/i, agent: "aria" },
];

export interface RoutingDecision {
  agent: AgentDefinition;
  allowed: boolean;
  denials: string[];
  context: HandoffContext;
}

export function route(params: {
  clientId: string;
  phase: ClientPhase;
  channel: Channel;
  stateCode: string;
  localHour: number;
  utterance?: string;
  fromAgent?: AgentId;
}): RoutingDecision {
  const denials: string[] = [];

  if (!isServiceableState(params.stateCode)) {
    denials.push(`X Debt is not licensed to operate in ${params.stateCode}; enrollment and servicing are blocked.`);
  }
  if (params.channel === "voice" && !withinCallingHours(params.localHour)) {
    denials.push("Outside TCPA calling hours (8 AM–9 PM client local time).");
  }

  const intentAgent = params.utterance
    ? INTENT_ROUTES.find((r) => r.pattern.test(params.utterance!))?.agent
    : undefined;
  const agentId = intentAgent ?? PHASE_DEFAULT_AGENT[params.phase];
  const agent = AGENT_MAP.get(agentId)!;

  if (!agent.channels.includes(params.channel)) {
    denials.push(`${agent.name} does not operate on channel "${params.channel}".`);
  }

  return {
    agent,
    allowed: denials.length === 0,
    denials,
    context: {
      clientId: params.clientId,
      phase: params.phase,
      reason: intentAgent ? `intent match → ${agentId}` : `phase default → ${agentId}`,
      fromAgent: params.fromAgent ?? null,
      channel: params.channel,
      complianceFlags: denials,
    },
  };
}

/** What the routed agent is permitted to do right now, per phase gates. */
export function permittedActions(phase: ClientPhase): string[] {
  return PHASE_PERMISSIONS[phase];
}

/** Evaluate an agent's escalation rules against a triggered condition. */
export function checkEscalation(agent: AgentDefinition, condition: string) {
  return agent.escalations.find((rule) =>
    condition.toLowerCase().includes(rule.trigger.toLowerCase().split(" ")[0])
  );
}

/**
 * Core types for X Debt's autonomous agent workforce.
 *
 * Every client-facing task at X Debt is executed by a specialized AI agent.
 * Agents communicate with clients over voice (real-time speech-to-speech),
 * SMS, and email, and with each other through typed handoffs managed by the
 * orchestrator. Every agent operates inside hard compliance guardrails
 * enforced by the Sentinel compliance layer — guardrails are code, not
 * prompt suggestions.
 */

export type AgentId =
  | "aria" // Enrollment & Intake
  | "atlas" // Debt Analysis
  | "nova" // Creditor Negotiation
  | "ledger" // Dedicated Account & Payments
  | "sentinel" // Compliance & Legal Guardrails
  | "echo" // Voice Communications
  | "sage" // Client Success & Coaching
  | "pulse" // Credit & Risk Monitoring
  | "guardian"; // Creditor Relations & Escalations

export type Channel = "voice" | "sms" | "email" | "chat" | "internal";

export interface VoiceProfile {
  /** TTS voice identifier used by the realtime voice pipeline. */
  voiceId: string;
  /** Perceived persona register for the voice agent. */
  style: "warm" | "analytical" | "assertive" | "calm" | "precise";
  /** Words-per-minute target for speech synthesis. */
  paceWpm: number;
  /** Languages the agent can hold live calls in. */
  languages: string[];
}

export interface EscalationRule {
  /** Condition that triggers the escalation, evaluated by the orchestrator. */
  trigger: string;
  /** Where the conversation goes. "human-attorney" leaves the AI workforce. */
  target: AgentId | "human-attorney" | "human-supervisor";
  /** Whether the current call/thread must stop immediately. */
  haltInteraction: boolean;
}

export interface AgentDefinition {
  id: AgentId;
  /** Public-facing agent name. */
  name: string;
  /** One-line specialty shown on the site and used in call introductions. */
  role: string;
  /** Longer description of the agent's responsibilities. */
  summary: string;
  /** System prompt establishing specialty, boundaries, and tone. */
  systemPrompt: string;
  /** Tool names this agent may call. Anything not listed is denied. */
  allowedTools: string[];
  /** Channels this agent may use to reach clients or creditors. */
  channels: Channel[];
  /** Voice configuration; omitted for internal-only agents. */
  voice?: VoiceProfile;
  /** Compliance disclosures the agent MUST deliver, keyed to lifecycle events. */
  requiredDisclosures: string[];
  /** Hard "never do" rules enforced by Sentinel on every outbound message. */
  prohibitions: string[];
  /** When and to whom this agent hands off. */
  escalations: EscalationRule[];
}

export type ClientPhase =
  | "prospect"
  | "intake"
  | "enrolled-saving"
  | "negotiating"
  | "settling"
  | "graduated"
  | "withdrawn";

export interface HandoffContext {
  clientId: string;
  phase: ClientPhase;
  reason: string;
  fromAgent: AgentId | null;
  channel: Channel;
  /** Flags set by Sentinel that constrain what the next agent may say/do. */
  complianceFlags: string[];
}

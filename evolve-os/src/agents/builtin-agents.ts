import type { ExecutableAgent, AgentContext } from "./fleet.js";

/**
 * Reference fleet: a small set of cooperating agents that demonstrate the
 * multi-agent pattern. Replace their `handle` bodies with real LLM/agent loops
 * (e.g. Claude via the Anthropic SDK) — the coordination contract stays the same.
 */

/** Talks to the Evolve voice connector. */
export class VoiceAgent implements ExecutableAgent {
  readonly name = "evolve-voice";
  async handle(input: unknown, ctx: AgentContext): Promise<unknown> {
    const { utterance, lang } = (input ?? {}) as { utterance?: string; lang?: string };
    if (!utterance) return { error: "no utterance provided" };
    ctx.log("handling voice turn", { lang });
    return ctx.connectors.invoke("evolve.voice", { utterance, lang }, {
      agentId: ctx.agentId, tenantId: ctx.tenantId, capabilities: ctx.capabilities, signal: ctx.signal,
    });
  }
}

/** Classifies intent from text (stub heuristic; swap for a model call). */
export class IntentAgent implements ExecutableAgent {
  readonly name = "evolve-intent";
  async handle(input: unknown): Promise<unknown> {
    const text = String((input as { text?: string })?.text ?? "").toLowerCase();
    let intent = "unknown";
    if (/book|schedule|demo|meeting/.test(text)) intent = "book_demo";
    else if (/pric|cost|quote|plan/.test(text)) intent = "pricing";
    else if (/support|help|issue|broken/.test(text)) intent = "support";
    else if (/buy|purchase|subscribe/.test(text)) intent = "purchase";
    return { intent, confidence: intent === "unknown" ? 0.3 : 0.9 };
  }
}

/** Drafts a response for a given intent (stub; swap for a model call). */
export class ResponderAgent implements ExecutableAgent {
  readonly name = "evolve-responder";
  async handle(input: unknown): Promise<unknown> {
    const intent = String((input as { intent?: string })?.intent ?? "unknown");
    const replies: Record<string, string> = {
      book_demo: "Happy to set up a demo — what time works for you?",
      pricing: "Our plans scale with usage; I can share a tailored quote.",
      support: "Sorry you hit a snag — can you describe what happened?",
      purchase: "Great! I can start your onboarding right now.",
      unknown: "Tell me a bit more and I'll point you the right way.",
    };
    return { reply: replies[intent] ?? replies["unknown"] };
  }
}

/**
 * Coordinator: composes the fleet. It delegates to the intent agent, then the
 * responder, then (optionally) speaks via the voice agent — a real multi-agent
 * pipeline running under the OS's policy and audit controls.
 */
export class CoordinatorAgent implements ExecutableAgent {
  readonly name = "evolve-coordinator";
  async handle(input: unknown, ctx: AgentContext): Promise<unknown> {
    const { text, speak } = (input ?? {}) as { text?: string; speak?: boolean };
    if (!text) return { error: "no text provided" };

    ctx.log("coordinating request", { speak: Boolean(speak) });
    const { intent, confidence } = (await ctx.delegate("evolve-intent", { text })) as {
      intent: string; confidence: number;
    };
    const { reply } = (await ctx.delegate("evolve-responder", { intent })) as { reply: string };

    let voice: unknown;
    if (speak) {
      voice = await ctx.delegate("evolve-voice", { utterance: reply });
    }
    return { intent, confidence, reply, ...(voice ? { voice } : {}) };
  }
}

/** Convenience: the default reference fleet. */
export function defaultAgents(): ExecutableAgent[] {
  return [new VoiceAgent(), new IntentAgent(), new ResponderAgent(), new CoordinatorAgent()];
}

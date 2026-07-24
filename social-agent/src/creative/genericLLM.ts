import type { ChatMessage, LLMProvider } from "./types.js";
import type { ProviderConfig } from "../config/types.js";
import { resolveProviderApiKey } from "../config/config.js";
import { childLogger } from "../core/logger.js";

const log = childLogger("llm");

/**
 * Works with any OpenAI-compatible chat-completions endpoint: OpenAI, Groq,
 * Together, Fireworks, local Ollama (with its OpenAI-compat route), or a
 * self-hosted proxy in front of another model. Point baseUrl + model at
 * whatever backend you want — this is the "any LLM, any API key" adapter.
 */
export class OpenAICompatibleLLM implements LLMProvider {
  readonly id: string;
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(cfg: ProviderConfig) {
    this.id = cfg.id;
    this.apiKey = resolveProviderApiKey(cfg.apiKeyEnv);
    this.baseUrl = cfg.baseUrl?.replace(/\/$/, "") || "https://api.openai.com/v1";
    this.model = cfg.model || "gpt-4o-mini";
  }

  async chat(messages: ChatMessage[], opts?: { json?: boolean; maxTokens?: number }): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: opts?.maxTokens ?? 1024,
        response_format: opts?.json ? { type: "json_object" } : undefined,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`[${this.id}] LLM request failed: ${res.status} ${body}`);
    }
    const data = (await res.json()) as any;
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      log.warn({ data }, "empty completion from LLM provider");
      throw new Error(`[${this.id}] LLM returned no content`);
    }
    return content as string;
  }
}

/** Native Anthropic Messages API adapter. */
export class AnthropicLLM implements LLMProvider {
  readonly id: string;
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(cfg: ProviderConfig) {
    this.id = cfg.id;
    this.apiKey = resolveProviderApiKey(cfg.apiKeyEnv);
    this.baseUrl = cfg.baseUrl?.replace(/\/$/, "") || "https://api.anthropic.com/v1";
    this.model = cfg.model || "claude-sonnet-5";
  }

  async chat(messages: ChatMessage[], opts?: { json?: boolean; maxTokens?: number }): Promise<string> {
    const system = messages.find((m) => m.role === "system")?.content;
    const rest = messages.filter((m) => m.role !== "system");

    const res = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        system,
        max_tokens: opts?.maxTokens ?? 1024,
        messages: rest.map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`[${this.id}] Anthropic request failed: ${res.status} ${body}`);
    }
    const data = (await res.json()) as any;
    const text = data.content?.map((b: any) => b.text).join("") ?? "";
    if (!text) throw new Error(`[${this.id}] Anthropic returned no content`);
    return text;
  }
}

export function buildLLMProvider(cfg: ProviderConfig): LLMProvider {
  switch (cfg.kind) {
    case "llm-anthropic":
      return new AnthropicLLM(cfg);
    case "llm-openai-compatible":
      return new OpenAICompatibleLLM(cfg);
    default:
      throw new Error(`Provider "${cfg.id}" is not an LLM provider (kind=${cfg.kind})`);
  }
}

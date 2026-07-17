import type { Connector, ConnectorHealth, InvocationContext } from "./connector.js";

/**
 * Reference connectors that show the wiring pattern for Evolve's own stack.
 * These are intentionally dependency-free stubs — replace the `invoke` body
 * with real API calls (fetch to your service, SDK usage, DB query). The shape,
 * capability gating, and audit integration stay identical.
 */

/** Wraps an HTTP(S) service as a connector. */
export class HttpServiceConnector implements Connector<HttpRequest, HttpResponse> {
  constructor(
    public readonly id: string,
    public readonly displayName: string,
    public readonly requiredCapability: string,
    private readonly baseUrl: string,
    private readonly defaultHeaders: Record<string, string> = {},
  ) {}

  async health(): Promise<ConnectorHealth> {
    try {
      const res = await fetch(new URL("/health", this.baseUrl), { method: "GET" });
      return { healthy: res.ok, detail: `status ${res.status}` };
    } catch (err) {
      return { healthy: false, detail: err instanceof Error ? err.message : String(err) };
    }
  }

  async invoke(input: HttpRequest, ctx: InvocationContext): Promise<HttpResponse> {
    const url = new URL(input.path, this.baseUrl);
    const res = await fetch(url, {
      method: input.method ?? "POST",
      headers: {
        "content-type": "application/json",
        "x-evolve-tenant": ctx.tenantId,
        "x-evolve-agent": ctx.agentId,
        ...this.defaultHeaders,
        ...input.headers,
      },
      body: input.body !== undefined ? JSON.stringify(input.body) : undefined,
      ...(ctx.signal ? { signal: ctx.signal } : {}),
    });
    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }
    return { status: res.status, ok: res.ok, body: json };
  }
}

export interface HttpRequest {
  path: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
}
export interface HttpResponse {
  status: number;
  ok: boolean;
  body: unknown;
}

/**
 * Example: an Evolve voice-agent connector. In production this would call your
 * real-time voice service; here it echoes to demonstrate the contract.
 */
export class EvolveVoiceConnector implements Connector<VoiceTurn, VoiceReply> {
  readonly id = "evolve.voice";
  readonly displayName = "Evolve Real-Time Voice";
  readonly requiredCapability = "connector:invoke";

  async health(): Promise<ConnectorHealth> {
    return { healthy: true, detail: "reference stub" };
  }

  async invoke(input: VoiceTurn, _ctx: InvocationContext): Promise<VoiceReply> {
    return {
      transcript: input.utterance,
      reply: `Evolve voice agent received: "${input.utterance}"`,
      lang: input.lang ?? "en",
    };
  }
}

export interface VoiceTurn {
  utterance: string;
  lang?: string;
}
export interface VoiceReply {
  transcript: string;
  reply: string;
  lang: string;
}

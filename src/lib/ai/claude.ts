/**
 * Thin, dependency-free client for the Anthropic Messages API, used to power the
 * consumer-advocate analysis tools with real document understanding (Claude's
 * vision reads uploaded bills/policies directly — no separate OCR service).
 *
 * Design: it degrades gracefully. `aiConfigured()` is false unless an
 * ANTHROPIC_API_KEY is set, and every call returns `null` on any error or when
 * unconfigured, so callers fall back to the deterministic engines. Guardrails
 * (disclaimers, "never say covered", document discard) stay in server code and
 * the result shapes, NOT in model output — the model fills fields, the platform
 * owns the framing. Uses fetch (works on Node and Cloudflare Workers) and
 * structured outputs so responses are valid JSON against our schema.
 */

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";
const BASE_URL = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
const API_VERSION = "2023-06-01";

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export interface AiFile {
  mediaType: string; // e.g. "application/pdf", "image/png", "text/plain"
  base64: string;    // base64-encoded bytes (no data: prefix, no newlines)
}

interface ContentBlock {
  type: string;
  [k: string]: unknown;
}

/**
 * Run one structured analysis. Returns the parsed object matching `schema`, or
 * `null` if unconfigured, on any API/parse error, or if the model declines.
 * The document is sent inline and never persisted by us.
 */
export async function analyzeJson<T>(input: {
  system: string;
  userText: string;
  file?: AiFile;
  schema: Record<string, unknown>;
  maxTokens?: number;
}): Promise<T | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  const content: ContentBlock[] = [];
  const f = input.file;
  if (f) {
    if (f.mediaType === "application/pdf") {
      content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: f.base64 } });
    } else if (f.mediaType.startsWith("image/")) {
      content.push({ type: "image", source: { type: "base64", media_type: f.mediaType, data: f.mediaType === "image/jpg" ? f.base64 : f.base64 } });
    } else if (f.mediaType.startsWith("text/")) {
      try {
        const decoded = Buffer.from(f.base64, "base64").toString("utf8").slice(0, 60_000);
        input = { ...input, userText: `${input.userText}\n\n--- Document text ---\n${decoded}` };
      } catch { /* ignore undecodable text */ }
    }
    // Unknown types: fall through — the model works from userText alone.
  }
  content.push({ type: "text", text: input.userText });

  try {
    const res = await fetch(`${BASE_URL}/v1/messages`, {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": API_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: input.maxTokens ?? 4096,
        system: input.system,
        messages: [{ role: "user", content }],
        output_config: { format: { type: "json_schema", schema: input.schema } },
      }),
      // Analyses can take a while; don't let a slow response hang a request forever.
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      console.error("claude api error", res.status, await safeText(res));
      return null;
    }
    const data = (await res.json()) as { stop_reason?: string; content?: { type: string; text?: string }[] };
    if (data.stop_reason === "refusal") return null;
    const text = data.content?.find((b) => b.type === "text")?.text;
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch (e) {
    console.error("claude analyze failed", e);
    return null;
  }
}

async function safeText(res: Response): Promise<string> {
  try { return (await res.text()).slice(0, 500); } catch { return "?"; }
}

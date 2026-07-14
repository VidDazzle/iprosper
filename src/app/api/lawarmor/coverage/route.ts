import { NextRequest, NextResponse } from "next/server";
import { analyzeCoverage, buildCoverageActions, type CoverageResult, type ProbabilityBand } from "@/lib/lawarmor/coverage";
import { consentFromRequest, consentIsCurrent } from "@/lib/consent/auth";
import { aiConfigured, analyzeJson } from "@/lib/ai/claude";
import { rateLimited } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const MAX_BYTES = 15 * 1024 * 1024;
const CONSENT_REQUIRED = { error: "Please sign the disclosure before checking coverage.", code: "consent_required" };

const BAND_LABELS: Record<ProbabilityBand, string> = {
  high: "High probability of coverage",
  medium: "Medium probability of coverage",
  low: "Low probability of coverage",
  insufficient: "Not enough information yet",
};

// The model fills these fields; the platform owns everything else (agent,
// domain label, disclaimer) so the guardrails can't be overridden by output.
const COVERAGE_SCHEMA = {
  type: "object",
  properties: {
    band: { type: "string", enum: ["high", "medium", "low", "insufficient"] },
    headline: { type: "string" },
    supporting: { type: "array", items: { type: "string" } },
    concerns: { type: "array", items: { type: "string" } },
    reasons: { type: "array", items: { type: "string" } },
    followUps: { type: "array", items: { type: "string" } },
  },
  required: ["band", "headline", "supporting", "concerns", "reasons", "followUps"],
  additionalProperties: false,
} as const;

const COVERAGE_SYSTEM = `You are a specialist insurance/warranty coverage analyst for a consumer-advocacy platform. You read a consumer's policy, warranty, or service agreement and what they told you, and estimate the PROBABILITY their described loss may be covered.

HARD RULES — never break these:
- NEVER tell the consumer they are covered, or use words like "yes", "definitely", "guaranteed", or "you are covered". Output only a probability band: "high", "medium", "low", or "insufficient".
- Base the estimate ONLY on the document's own language and what the consumer said. Quote the exact policy sentences that may support coverage (supporting) and those that may limit or exclude it (concerns) — verbatim short quotes from the document, not paraphrase.
- "high" requires the document's own language to clearly cover the described cause AND no applicable exclusion AND enough facts. When key facts (why/when/where/how, sudden vs. gradual) are missing, use "insufficient" or a lower band and put the specific questions in followUps.
- headline must be phrased as a probability, never a conclusion (e.g. "Based on this policy, there is a MEDIUM probability your situation may be covered").
- reasons: plain-English bullets explaining the band. If the document text was not provided or unreadable, say so and lower the band.
Return ONLY the JSON object matching the schema.`;

/**
 * Estimate the PROBABILITY (low / medium / high) that a described loss may be
 * covered. Uses Claude to read the actual document when ANTHROPIC_API_KEY is
 * configured; otherwise falls back to the deterministic keyword engine. Any
 * uploaded document is read into memory, analyzed, and discarded — never stored.
 * Never confirms coverage.
 */
export async function POST(request: NextRequest) {
  try {
    const rl = rateLimited(request, "coverage", 30, 60_000); if (rl) return rl;
    if (!consentIsCurrent(consentFromRequest(request))) return NextResponse.json(CONSENT_REQUIRED, { status: 403 });

    const ct = request.headers.get("content-type") ?? "";
    let domain = "";
    let question = "";
    let policyText = "";
    let fileMedia = "";
    let fileB64 = "";

    if (ct.includes("multipart/form-data")) {
      const form = await request.formData();
      domain = String(form.get("domain") ?? "");
      question = String(form.get("question") ?? "");
      policyText = String(form.get("policyText") ?? "");
      const file = form.get("file");
      if (file instanceof File && file.size > 0) {
        if (file.size > MAX_BYTES) return NextResponse.json({ error: "Files must be under 15 MB." }, { status: 400 });
        // Read into memory for analysis, then let it go out of scope. Never stored.
        const buf = Buffer.from(await file.arrayBuffer());
        fileMedia = file.type || "application/octet-stream";
        fileB64 = buf.toString("base64");
      }
    } else {
      const body = await request.json();
      domain = String(body.domain ?? "");
      question = String(body.question ?? "");
      policyText = String(body.policyText ?? "");
    }

    if (!question.trim() || question.trim().length < 5) {
      return NextResponse.json({ error: "Tell us what happened and what you want to know (e.g. “my roof is leaking after a storm — is it covered?”)." }, { status: 400 });
    }

    // Deterministic result is both the fallback and the scaffold (agent, domain
    // label, disclaimer) the LLM enrichment fills in around.
    const base = analyzeCoverage({ domain, question, policyText });
    let result: CoverageResult = base;
    let usedAi = false;

    if (aiConfigured()) {
      const userText =
        `Coverage type: ${base.domainLabel}\n` +
        `Consumer's question / what happened:\n${question}\n\n` +
        (policyText ? `Policy/warranty text they pasted:\n${policyText}\n` : `They did not paste policy text; read any attached document.\n`);
      const llm = await analyzeJson<{
        band: ProbabilityBand; headline: string; supporting: string[]; concerns: string[]; reasons: string[]; followUps: string[];
      }>({
        system: COVERAGE_SYSTEM,
        userText,
        file: fileB64 ? { mediaType: fileMedia, base64: fileB64 } : undefined,
        schema: COVERAGE_SCHEMA as unknown as Record<string, unknown>,
      });
      if (llm && ["high", "medium", "low", "insufficient"].includes(llm.band)) {
        usedAi = true;
        result = {
          ...base,
          band: llm.band,
          bandLabel: BAND_LABELS[llm.band],
          headline: llm.headline || base.headline,
          supporting: Array.isArray(llm.supporting) ? llm.supporting : base.supporting,
          concerns: Array.isArray(llm.concerns) ? llm.concerns : base.concerns,
          reasons: Array.isArray(llm.reasons) && llm.reasons.length ? llm.reasons : base.reasons,
          followUps: Array.isArray(llm.followUps) ? llm.followUps : base.followUps,
        };
      }
    }

    // Consumer-chosen next steps (questions + request-for-determination letter),
    // built from the finalized result.
    result = { ...result, actions: buildCoverageActions(result, question) };

    return NextResponse.json({ success: true, discarded: true, engine: usedAi ? "ai" : "deterministic", result });
  } catch (e) {
    console.error("lawarmor coverage error", e);
    return NextResponse.json({ error: "Coverage check failed. Please try again." }, { status: 500 });
  }
}

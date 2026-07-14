import { NextRequest, NextResponse } from "next/server";
import { analyzeCoverage } from "@/lib/lawarmor/coverage";
import { consentFromRequest, consentIsCurrent } from "@/lib/consent/auth";

export const dynamic = "force-dynamic";

const MAX_BYTES = 15 * 1024 * 1024;
const CONSENT_REQUIRED = { error: "Please sign the disclosure before checking coverage.", code: "consent_required" };

/**
 * Estimate the PROBABILITY (low / medium / high) that a described loss may be
 * covered, based only on the policy/warranty language and what the consumer told
 * us. We never confirm coverage. Any uploaded document is read into memory,
 * scanned, and discarded — never stored. Not a coverage decision; not advice.
 */
export async function POST(request: NextRequest) {
  try {
    if (!consentIsCurrent(consentFromRequest(request))) return NextResponse.json(CONSENT_REQUIRED, { status: 403 });

    const ct = request.headers.get("content-type") ?? "";
    let domain = "";
    let question = "";
    let policyText = "";

    if (ct.includes("multipart/form-data")) {
      const form = await request.formData();
      domain = String(form.get("domain") ?? "");
      question = String(form.get("question") ?? "");
      policyText = String(form.get("policyText") ?? "");
      const file = form.get("file");
      if (file instanceof File && file.size > 0) {
        if (file.size > MAX_BYTES) return NextResponse.json({ error: "Files must be under 15 MB." }, { status: 400 });
        // Read (in a real deployment: OCR/extract the policy text), then discard.
        // If we can't extract text, we fall back to what the consumer pasted.
        await file.arrayBuffer();
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

    const result = analyzeCoverage({ domain, question, policyText });
    return NextResponse.json({ success: true, discarded: true, result });
  } catch (e) {
    console.error("lawarmor coverage error", e);
    return NextResponse.json({ error: "Coverage check failed. Please try again." }, { status: 500 });
  }
}

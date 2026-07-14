import { NextRequest, NextResponse } from "next/server";
import { auditBill, type BillLine, type BillContext } from "@/lib/health/audit";
import { consentFromRequest, consentIsCurrent } from "@/lib/consent/auth";
import { rateLimited } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const MAX_LINES = 200;

const CONSENT_REQUIRED = { error: "Please sign the disclosure before running an audit.", code: "consent_required" };

/**
 * Audit an itemized medical bill and return a report of likely errors, an
 * estimated amount worth questioning, and a dispute-ready summary.
 *
 * PRIVACY: the audit runs on the numbers submitted and is discarded with the
 * response — nothing is stored. This is NOT legal or medical advice.
 */
export async function POST(request: NextRequest) {
  try {
    const rl = rateLimited(request, "health-audit", 30, 60_000); if (rl) return rl;
    if (!consentIsCurrent(consentFromRequest(request))) return NextResponse.json(CONSENT_REQUIRED, { status: 403 });

    const body = await request.json();
    const rawLines = Array.isArray(body.lines) ? body.lines : [];
    if (rawLines.length < 1) return NextResponse.json({ error: "Add at least one line item to audit." }, { status: 400 });
    if (rawLines.length > MAX_LINES) return NextResponse.json({ error: `Please audit up to ${MAX_LINES} lines at a time.` }, { status: 400 });

    const lines: BillLine[] = rawLines.map((l: Record<string, unknown>) => ({
      code: typeof l.code === "string" ? l.code : undefined,
      description: String(l.description ?? ""),
      units: Number(l.units ?? 1),
      charge: Number(l.charge ?? 0),
    }));
    if (!lines.some((l) => l.description.trim())) {
      return NextResponse.json({ error: "Each line needs a description and a charge." }, { status: 400 });
    }

    const ctx: BillContext = {
      emergency: Boolean(body.context?.emergency),
      outOfNetwork: Boolean(body.context?.outOfNetwork),
      uninsured: Boolean(body.context?.uninsured),
      eobPatientResponsibility:
        body.context?.eobPatientResponsibility === "" || body.context?.eobPatientResponsibility == null
          ? undefined
          : Number(body.context.eobPatientResponsibility),
    };

    const report = auditBill(lines, ctx);
    return NextResponse.json({ success: true, discarded: true, report });
  } catch (e) {
    console.error("health audit error", e);
    return NextResponse.json({ error: "Audit failed. Please try again." }, { status: 500 });
  }
}

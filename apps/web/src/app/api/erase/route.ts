import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eraseLead } from "@apex/audit";
// Imported from the specific module (not the @apex/pipeline barrel) to
// avoid dragging scrape.ts's Playwright dependency into this route.
import { revokeConsent } from "@apex/pipeline/src/consent.js";

const bodySchema = z.object({ leadId: z.string().min(1) });

/**
 * Spec Section 4: "/api/erase endpoint for PII deletion on request."
 * Also revokes consent first (cancelling any pending Closer/nurture
 * queue jobs, spec Section 7) — erasing someone's data while still
 * queued to text them would defeat the point.
 */
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "leadId is required." }, { status: 400 });
  }

  try {
    await revokeConsent(parsed.data.leadId, "api:erase-request");
    await eraseLead(parsed.data.leadId, "api:erase-request");
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to erase lead." },
      { status: 500 },
    );
  }
}

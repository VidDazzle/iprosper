import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
// Imported from the specific module (not the @apex/pipeline barrel) so
// this route doesn't drag scrape.ts's Playwright dependency into the
// Next.js server bundle — this endpoint only ever needs notify.ts.
import { captureLead, MissingConsentError } from "@apex/pipeline/src/notify.js";

const bodySchema = z.object({
  jobId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  consentText: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing or invalid lead fields." }, { status: 400 });
  }

  try {
    const lead = await captureLead(parsed.data);
    return NextResponse.json({ success: true, leadId: lead.id }, { status: 201 });
  } catch (err) {
    if (err instanceof MissingConsentError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to capture lead." },
      { status: 500 },
    );
  }
}

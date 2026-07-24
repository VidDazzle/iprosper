import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eraseLead } from "@apex/audit";

const bodySchema = z.object({ leadId: z.string().min(1) });

/** Spec Section 4: "/api/erase endpoint for PII deletion on request." */
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "leadId is required." }, { status: 400 });
  }

  try {
    await eraseLead(parsed.data.leadId, "api:erase-request");
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to erase lead." },
      { status: 500 },
    );
  }
}

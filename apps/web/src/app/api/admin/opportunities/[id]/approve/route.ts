import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { approveOpportunity, OpportunityNotApprovableError } from "@apex/scout";
import { isAdminRequest } from "@/lib/adminAuth";

const bodySchema = z.object({
  agentId: z.string().min(1),
  budgetCap: z.number().positive(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "agentId and a positive budgetCap are required." }, { status: 400 });
  }

  try {
    const job = await approveOpportunity(id, "admin-dashboard", parsed.data.agentId, parsed.data.budgetCap);
    return NextResponse.json(job);
  } catch (err) {
    if (err instanceof OpportunityNotApprovableError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}

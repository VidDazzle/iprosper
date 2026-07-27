import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rejectOpportunity } from "@apex/scout";
import { isAdminRequest } from "@/lib/adminAuth";

const bodySchema = z.object({ reason: z.string().min(1) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A reason is required." }, { status: 400 });
  }

  await rejectOpportunity(id, "admin-dashboard", parsed.data.reason);
  return NextResponse.json({ success: true });
}

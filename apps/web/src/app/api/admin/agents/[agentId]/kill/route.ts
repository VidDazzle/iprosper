import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { kill, UnknownAgentError } from "@apex/agents";
import { isAdminRequest } from "@/lib/adminAuth";

const bodySchema = z.object({ reason: z.string().min(1) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { agentId } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A reason is required." }, { status: 400 });
  }

  try {
    const result = await kill(agentId, parsed.data.reason, "admin-dashboard");
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof UnknownAgentError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}

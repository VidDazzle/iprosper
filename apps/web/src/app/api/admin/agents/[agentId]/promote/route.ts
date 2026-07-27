import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@apex/db";
import { promoteAgent } from "@apex/agents";
import { isAdminRequest } from "@/lib/adminAuth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { agentId } = await params;

  try {
    const result = await promoteAgent(agentId, "admin-dashboard");
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: `No agent with id "${agentId}".` }, { status: 404 });
    }
    throw err;
  }
}

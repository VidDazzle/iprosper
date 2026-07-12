import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/portal/session";
import { listApprovals, getApproval, decideApproval, addNotification } from "@/lib/portal/store";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const approvals = await listApprovals(session.cid);
  return NextResponse.json({ approvals });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id, decision } = await request.json();
    const approval = await getApproval(Number(id));
    if (!approval || approval.clientId !== session.cid) {
      return NextResponse.json({ error: "Approval not found." }, { status: 404 });
    }
    if (approval.status !== "pending") {
      return NextResponse.json({ error: `This request was already ${approval.status}.` }, { status: 409 });
    }
    if (decision !== "approved" && decision !== "rejected") {
      return NextResponse.json({ error: "Invalid decision." }, { status: 400 });
    }

    const updated = await decideApproval(approval.id, decision, "portal");
    await addNotification(
      session.cid,
      decision === "approved"
        ? `You approved: ${approval.title}. ${approval.agent === "nova" ? "Nova will execute the settlement and Sentinel will verify it." : "The team will proceed."}`
        : `You declined: ${approval.title}. No action will be taken.`
    );
    return NextResponse.json({ success: true, approval: updated });
  } catch (e) {
    console.error("approval decision error", e);
    return NextResponse.json({ error: "Could not record your decision." }, { status: 500 });
  }
}

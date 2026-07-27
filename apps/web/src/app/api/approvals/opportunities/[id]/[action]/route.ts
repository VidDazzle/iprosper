import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@apex/db";
import { verifyApprovalSignature } from "@apex/config";
import { approveOpportunity, rejectOpportunity, OpportunityNotApprovableError } from "@apex/scout";

export const dynamic = "force-dynamic";

/**
 * One-click, no-login approval link delivered by SMS/email for a
 * Scout candidate above the autonomous cap. The HMAC signature IS the
 * auth (same trust model as /preview/[jobId]) — deliberately public,
 * no session required, since this is meant to be tapped from a phone.
 * Returns a small HTML confirmation rather than JSON for that reason.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; action: string }> }) {
  const { id, action } = await params;

  if (action !== "approve" && action !== "reject") {
    return htmlResponse("Invalid link.", 400);
  }

  const expParam = req.nextUrl.searchParams.get("exp");
  const sig = req.nextUrl.searchParams.get("sig");
  if (!expParam || !sig) {
    return htmlResponse("This link is missing its signature.", 400);
  }

  const expiresAtMs = Number(expParam);
  if (!verifyApprovalSignature(id, action, expiresAtMs, sig)) {
    return htmlResponse("This link is invalid or has expired.", 401);
  }

  const candidate = await prisma.opportunityCandidate.findUnique({ where: { id } });
  if (!candidate) {
    return htmlResponse("This opportunity no longer exists.", 404);
  }

  if (candidate.status !== "pending_review") {
    // Idempotent: already acted on (by you, or auto-approved in the
    // meantime) — report current state instead of double-acting.
    return htmlResponse(`"${candidate.name}" is already ${candidate.status}. No action taken.`, 200);
  }

  try {
    if (action === "approve") {
      // The amount stated in the SMS/email IS the amount this commits
      // to — read back the figure stored when that message was sent
      // (packages/scout/autonomousApproval.ts), not whatever the
      // effective cap happens to be right now.
      const request = await prisma.auditLog.findFirst({
        where: { action: "approval_request_sent", target: id },
        orderBy: { createdAt: "desc" },
      });
      const detail = request?.detail as { escalationAmount?: number } | null;
      const amount = detail?.escalationAmount;
      if (!amount) {
        return htmlResponse("This opportunity has no recorded approval request to honor. Use the admin dashboard instead.", 409);
      }

      await approveOpportunity(id, "owner:approval-link", `scout-owner-${id}`, amount);
      return htmlResponse(`Approved "${candidate.name}" at $${amount}.`, 200);
    } else {
      await rejectOpportunity(id, "owner:approval-link", "rejected via approval link");
      return htmlResponse(`Rejected "${candidate.name}".`, 200);
    }
  } catch (err) {
    if (err instanceof OpportunityNotApprovableError) {
      return htmlResponse(err.message, 409);
    }
    throw err;
  }
}

function htmlResponse(message: string, status: number) {
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>APEX</title></head><body style="font-family:system-ui,sans-serif;padding:2rem;max-width:32rem;margin:0 auto;">
  <p style="font-size:1.1rem;">${escapeHtml(message)}</p>
  </body></html>`;
  return new NextResponse(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

import { NextRequest } from "next/server";
import { verifyApprovalToken } from "@/lib/portal/auth";
import { getApproval, decideApproval, addNotification } from "@/lib/portal/store";

/**
 * Public one-click approve/reject from an email or SMS link. The signed token
 * carries the approval id and the decision; no login is required, but the token
 * is HMAC-signed and expires, and the approval can only be decided once.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const parsed = verifyApprovalToken(token);
  const channel = request.nextUrl.searchParams.get("c") === "sms" ? "sms" : "email";

  if (!parsed) return html("Link expired", "This approval link is invalid or has expired. Please review it in your Solvana portal.", false);

  const approval = await getApproval(Number(parsed.aid));
  if (!approval) return html("Not found", "We couldn't find that request. It may have been removed.", false);

  if (approval.status !== "pending") {
    return html("Already recorded", `This request was already ${approval.status}. No further action is needed.`, true);
  }

  const decision = parsed.decision === "approve" ? "approved" : "rejected";
  await decideApproval(approval.id, decision, channel);
  await addNotification(
    approval.clientId,
    decision === "approved" ? `You approved: ${approval.title} (via ${channel}).` : `You declined: ${approval.title} (via ${channel}).`
  );

  return html(
    decision === "approved" ? "Approved ✓" : "Declined",
    decision === "approved"
      ? `Thank you. ${approval.title} is approved.${approval.agent === "nova" ? " Nova will execute the settlement and Sentinel will verify the written terms before any funds move." : ""}`
      : `Understood. ${approval.title} has been declined and no action will be taken.`,
    true
  );
}

function html(title: string, body: string, ok: boolean): Response {
  const color = ok ? "#22d3ee" : "#fb7185";
  return new Response(
    `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Solvana</title>
<style>body{margin:0;font-family:system-ui,sans-serif;background:#050810;color:#e2e8f0;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}
.card{max-width:460px;text-align:center;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:40px}
h1{color:${color};font-size:28px;margin:0 0 12px}p{color:#94a3b8;line-height:1.6;margin:0 0 24px}
a{display:inline-block;background:linear-gradient(90deg,#06b6d4,#7c3aed);color:#fff;text-decoration:none;padding:12px 28px;border-radius:9999px;font-weight:600}
.brand{color:#22d3ee;font-weight:700;margin-bottom:24px;font-size:18px}</style></head>
<body><div class="card"><div class="brand">Solvana<span style="color:#8b5cf6">.ai</span></div>
<h1>${title}</h1><p>${body}</p><a href="/portal/approvals">Open my portal</a></div></body></html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

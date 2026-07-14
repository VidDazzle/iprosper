import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/notify/channels";
import { consentFromRequest, consentIsCurrent } from "@/lib/consent/auth";
import { rateLimited } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BODY = 40_000;
const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] || c));

/**
 * Email the user their own analysis report. Consent-gated and rate-limited so it
 * can't be used as an open relay; the body is the report text the user is
 * already looking at. Sends via the notify email channel, which logs when email
 * isn't configured (graceful degradation).
 */
export async function POST(request: NextRequest) {
  try {
    const rl = rateLimited(request, "report-email", 5, 60_000); if (rl) return rl;
    if (!consentIsCurrent(consentFromRequest(request))) {
      return NextResponse.json({ error: "Please sign the disclosure first.", code: "consent_required" }, { status: 403 });
    }
    const body = await request.json();
    const to = String(body.email ?? "").trim();
    const title = String(body.title ?? "Your report").trim().slice(0, 120) || "Your report";
    const report = String(body.body ?? "");
    if (!EMAIL_RE.test(to)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    if (!report.trim()) return NextResponse.json({ error: "Nothing to send." }, { status: 400 });
    if (report.length > MAX_BODY) return NextResponse.json({ error: "Report is too large to email." }, { status: 400 });

    const html =
      `<div style="font-family:system-ui,sans-serif;max-width:640px;margin:auto;color:#0f172a">` +
      `<h2 style="color:#0891b2">${esc(title)}</h2>` +
      `<pre style="white-space:pre-wrap;font-family:inherit;font-size:14px;line-height:1.6">${esc(report)}</pre>` +
      `<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"/>` +
      `<p style="font-size:12px;color:#64748b">This is intelligence you requested from X Debt / Law &amp; Armor, not a recommendation or legal advice. The decision is yours; consult a licensed attorney if anything seems questionable. Your uploaded documents were analyzed and discarded — we did not store them.</p>` +
      `</div>`;

    const sent = await sendEmail(to, title, html);
    return NextResponse.json({ success: true, sent });
  } catch (e) {
    console.error("report email error", e);
    return NextResponse.json({ error: "Could not send. Please try again." }, { status: 500 });
  }
}

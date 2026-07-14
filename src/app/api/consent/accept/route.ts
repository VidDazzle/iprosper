import { NextRequest, NextResponse } from "next/server";
import { AGREEMENT_VERSION, REQUIRED_ACK_IDS, allAcksAccepted } from "@/lib/consent/agreement";
import { CONSENT_COOKIE, createConsentToken, consentCookieOptions } from "@/lib/consent/auth";
import { recordConsent } from "@/lib/consent/store";

export const dynamic = "force-dynamic";

/**
 * Record a signed disclosure + hold-harmless acknowledgment and set the
 * proof-of-consent cookie. The consumer must type their name and check every
 * required acknowledgment; the analysis tools refuse to run without this.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const scope = String(body.scope ?? "advocate") || "advocate";

    if (name.length < 2) {
      return NextResponse.json({ error: "Please type your full legal name to sign." }, { status: 400 });
    }
    if (!allAcksAccepted(body.acks)) {
      return NextResponse.json({ error: "You must check every box to accept the disclosure." }, { status: 400 });
    }

    const rec = recordConsent({
      name,
      version: AGREEMENT_VERSION,
      scope,
      acks: REQUIRED_ACK_IDS,
      userAgent: request.headers.get("user-agent") ?? undefined,
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    });

    const token = createConsentToken({ name, scope });
    const res = NextResponse.json({
      success: true,
      acceptedAt: rec.acceptedAt,
      version: AGREEMENT_VERSION,
      name,
    });
    res.cookies.set(CONSENT_COOKIE, token, consentCookieOptions);
    return res;
  } catch (e) {
    console.error("consent accept error", e);
    return NextResponse.json({ error: "Could not record your acceptance. Please try again." }, { status: 500 });
  }
}

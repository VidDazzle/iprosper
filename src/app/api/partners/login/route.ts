import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/portal/auth";
import { findPartnerByEmail, getPartner } from "@/lib/partners/store";
import { createAttorneyToken, ATTORNEY_COOKIE, attorneyCookieOptions } from "@/lib/partners/auth";

// Demo attorney so the dashboard is walkable without configuring one.
const DEMO_EMAIL = "attorney@xdebt.ai";
const DEMO_PASSWORD = "demo1234";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    const em = String(email ?? "").toLowerCase().trim();

    // Demo shortcut → the first seeded advertiser.
    if (em === DEMO_EMAIL && password === DEMO_PASSWORD) {
      const partner = await getPartner(1);
      if (partner) {
        const res = NextResponse.json({ success: true, firm: partner.firmName });
        res.cookies.set(ATTORNEY_COOKIE, createAttorneyToken({ pid: partner.id, email: partner.email, firm: partner.firmName }), attorneyCookieOptions);
        return res;
      }
    }

    const partner = await findPartnerByEmail(em);
    if (!partner || !partner.passwordHash || !(await verifyPassword(String(password ?? ""), partner.passwordHash))) {
      return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
    }
    if (partner.status !== "active") {
      return NextResponse.json({ error: "Your listing is still being activated. Beacon will email you when it's live." }, { status: 403 });
    }

    const res = NextResponse.json({ success: true, firm: partner.firmName });
    res.cookies.set(ATTORNEY_COOKIE, createAttorneyToken({ pid: partner.id, email: partner.email, firm: partner.firmName }), attorneyCookieOptions);
    return res;
  } catch {
    return NextResponse.json({ error: "Could not sign you in." }, { status: 500 });
  }
}

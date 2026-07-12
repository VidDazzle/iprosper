import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/portal/auth";
import { findUserByEmail, DEMO_CID } from "@/lib/portal/store";

// A demo account so the client experience is walkable without a database.
const DEMO_EMAIL = "demo@solvana.ai";
const DEMO_PASSWORD = "demo1234";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    const em = String(email ?? "").toLowerCase().trim();

    // Demo login shortcut.
    if (em === DEMO_EMAIL && password === DEMO_PASSWORD) {
      const token = createSessionToken({ uid: "demo", cid: DEMO_CID, name: "Jordan Rivera", email: DEMO_EMAIL, demo: true });
      const res = NextResponse.json({ success: true, name: "Jordan Rivera", demo: true });
      res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
      return res;
    }

    const user = await findUserByEmail(em);
    if (!user || !(await verifyPassword(String(password ?? ""), user.passwordHash))) {
      return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
    }

    const token = createSessionToken({ uid: user.id, cid: user.opsClientId, name: user.name, email: user.email });
    const res = NextResponse.json({ success: true, name: user.name });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return res;
  } catch (e) {
    console.error("login error", e);
    return NextResponse.json({ error: "Could not sign you in. Please try again." }, { status: 500 });
  }
}

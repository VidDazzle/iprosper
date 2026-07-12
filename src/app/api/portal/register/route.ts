import { NextRequest, NextResponse } from "next/server";
import { hashPassword, createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/portal/auth";
import { findUserByEmail, createUser } from "@/lib/portal/store";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, phone, opsClientId } = await request.json();

    if (!name || String(name).trim().length < 2)
      return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
    if (!email || !EMAIL_RE.test(email))
      return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
    if (!password || String(password).length < 8)
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

    const existing = await findUserByEmail(String(email).toLowerCase());
    if (existing)
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });

    const passwordHash = await hashPassword(String(password));
    const user = await createUser({
      name: String(name).trim(),
      email: String(email).toLowerCase(),
      passwordHash,
      phone: phone ? String(phone).trim() : undefined,
      opsClientId: opsClientId ? String(opsClientId).trim() : undefined,
      notifySms: Boolean(phone),
    });

    const token = createSessionToken({ uid: user.id, cid: user.opsClientId, name: user.name, email: user.email });
    const res = NextResponse.json({ success: true, name: user.name });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return res;
  } catch (e) {
    console.error("register error", e);
    return NextResponse.json({ error: "Could not create your account. Please try again." }, { status: 500 });
  }
}

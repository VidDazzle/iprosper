import { NextRequest, NextResponse } from "next/server";
import { verifyAdminCredentials, createAdminToken, ADMIN_COOKIE, adminCookieOptions } from "@/lib/admin/auth";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    const em = String(email ?? "").toLowerCase().trim();

    if (!(await verifyAdminCredentials(em, String(password ?? "")))) {
      return NextResponse.json({ error: "Incorrect staff credentials." }, { status: 401 });
    }

    const res = NextResponse.json({ success: true });
    res.cookies.set(ADMIN_COOKIE, createAdminToken(em), adminCookieOptions);
    return res;
  } catch (e) {
    console.error("admin login error", e);
    return NextResponse.json({ error: "Could not sign you in." }, { status: 500 });
  }
}

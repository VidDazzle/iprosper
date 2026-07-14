import { NextResponse } from "next/server";
import { ATTORNEY_COOKIE } from "@/lib/partners/auth";

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(ATTORNEY_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

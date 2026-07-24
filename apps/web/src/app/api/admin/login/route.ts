import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@apex/db";
import { appendAuditLog } from "@apex/audit";
import { loadEnv } from "@apex/config";
import { verifyPassword, createAdminSessionToken, ADMIN_SESSION_COOKIE } from "@/lib/adminAuth";

const bodySchema = z.object({ password: z.string().min(1) });

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }

  const ip = getClientIp(req);
  const windowStart = new Date(Date.now() - WINDOW_MS);

  const recentFailures = await prisma.auditLog.count({
    where: { action: "admin_login_failed", target: ip, createdAt: { gte: windowStart } },
  });

  if (recentFailures >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const env = loadEnv();
  if (!env.ADMIN_PASSWORD_HASH) {
    return NextResponse.json({ error: "Admin login is not configured (ADMIN_PASSWORD_HASH unset)." }, { status: 503 });
  }

  const valid = await verifyPassword(env.ADMIN_PASSWORD_HASH, parsed.data.password);

  if (!valid) {
    await appendAuditLog({ actor: "admin-login", action: "admin_login_failed", target: ip, detail: {} });
    return NextResponse.json({ error: "Invalid password." }, { status: 401 });
  }

  await appendAuditLog({ actor: "admin-login", action: "admin_login_succeeded", target: ip, detail: {} });

  const token = createAdminSessionToken();
  const res = NextResponse.json({ success: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/admin",
    maxAge: 24 * 60 * 60,
  });
  return res;
}

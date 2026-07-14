import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Lightweight health check for uptime monitors and post-deploy verification. */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "solvana",
    time: new Date().toISOString(),
    persistence: process.env.TURSO_CONNECTION_URL ? "database" : "in-memory",
    authConfigured: Boolean(process.env.SESSION_SECRET),
  });
}

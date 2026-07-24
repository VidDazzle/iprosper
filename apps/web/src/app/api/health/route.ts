import { NextResponse } from "next/server";
import { checkDb, checkRedis, statusFromChecks } from "@apex/health";

export const dynamic = "force-dynamic";

/**
 * Public, unauthenticated liveness check for external uptime monitors.
 * Runs its own live DB/Redis check on every request — deliberately not
 * reading the SystemHeartbeat table apps/apex writes to, since that
 * would only prove the *apex* process is alive, not that *this* app can
 * reach its dependencies. Error text is intentionally omitted from the
 * response so nothing about internal connection failures leaks
 * publicly; see the admin dashboard for full detail.
 */
export async function GET() {
  const [db, redis] = await Promise.all([checkDb(), checkRedis()]);
  const status = statusFromChecks({ db, redis });

  return NextResponse.json(
    {
      status,
      checks: {
        db: { ok: db.ok, latencyMs: db.latencyMs },
        redis: { ok: redis.ok, latencyMs: redis.latencyMs },
      },
    },
    { status: status === "ok" ? 200 : 503 },
  );
}

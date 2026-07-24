import cron from "node-cron";
import { runHeartbeat } from "@apex/health";

/**
 * Every 5 minutes — cadence isn't spec-defined (this isn't a spec
 * item at all; see packages/health). Tight enough that a dead process
 * is caught quickly, loose enough not to spam the DB.
 */
export function startHeartbeatCron() {
  return cron.schedule("*/5 * * * *", async () => {
    const row = await runHeartbeat();
    if (row.status !== "ok") {
      console.error("[heartbeat] degraded:", row.checks);
    }
  });
}

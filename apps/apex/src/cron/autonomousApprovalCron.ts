import cron from "node-cron";
import { runAutonomousApprovalSweep } from "@apex/scout";

/**
 * Every 15 minutes, alongside the sweeper — not spec-defined (per
 * explicit decision: "full autonomy with hard caps"). No-ops entirely
 * unless isAutonomousApprovalLive() (LIVE_MODE +
 * AUTONOMOUS_APPROVAL_ENABLED), so this is inert by default.
 */
export function startAutonomousApprovalCron() {
  return cron.schedule("*/15 * * * *", async () => {
    const { autoApproved, requestsSent } = await runAutonomousApprovalSweep();
    if (autoApproved.length || requestsSent.length) {
      console.info(
        `[autonomous-approval] auto-approved ${autoApproved.length}, sent ${requestsSent.length} approval request(s)`,
      );
    }
  });
}

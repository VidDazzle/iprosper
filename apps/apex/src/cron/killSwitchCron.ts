import cron from "node-cron";
import { checkAndFireKillSwitch } from "../killSwitch.js";

/** Hourly, per spec Section 8. */
export function startKillSwitchCron() {
  return cron.schedule("0 * * * *", async () => {
    const fired = await checkAndFireKillSwitch();
    if (fired.length > 0) {
      console.warn(`[kill-switch] fired for ${fired.length} agent(s):`, fired.map((f) => f.agentId));
    }
  });
}

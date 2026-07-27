import cron from "node-cron";
import { runWeeklyRebalance } from "../rebalance.js";

/** Sunday cron, per spec Section 8 ("Weekly rebalance job (Sunday cron)"). Runs at 00:05 UTC Sunday. */
export function startRebalanceCron() {
  return cron.schedule("5 0 * * 0", async () => {
    const result = await runWeeklyRebalance();
    console.info("[rebalance] applied:", result);
  });
}

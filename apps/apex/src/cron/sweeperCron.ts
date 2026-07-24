import cron from "node-cron";
import { sweepFailedJobs } from "@apex/dispatch";

/** Every 15 minutes — cadence isn't specified in the spec beyond "with backoff." */
export function startSweeperCron() {
  return cron.schedule("*/15 * * * *", async () => {
    const { retried, escalated } = await sweepFailedJobs();
    if (retried.length || escalated.length) {
      console.info(`[sweeper] retried ${retried.length}, escalated ${escalated.length}`);
    }
  });
}

import cron from "node-cron";
import { detectStuckJobs, sweepFailedJobs } from "@apex/dispatch";

/**
 * Every 15 minutes — cadence isn't specified in the spec beyond "with
 * backoff." Stuck-job detection runs first so anything that just went
 * stale in this same tick is immediately visible to the sweep that
 * follows, rather than waiting a full extra cycle.
 */
export function startSweeperCron() {
  return cron.schedule("*/15 * * * *", async () => {
    const stuck = await detectStuckJobs();
    if (stuck.length) {
      console.info(`[stuck-job-detector] marked ${stuck.length} job(s) failed`);
    }

    const { retried, escalated } = await sweepFailedJobs();
    if (retried.length || escalated.length) {
      console.info(`[sweeper] retried ${retried.length}, escalated ${escalated.length}`);
    }
  });
}

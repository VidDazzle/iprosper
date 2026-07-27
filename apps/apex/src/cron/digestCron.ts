import cron from "node-cron";
import { generateAndDeliverWeeklyDigest } from "@apex/digest";

/**
 * Spec Section 8: "delivered via owner digest before Sunday's
 * rebalance runs." Rebalance fires at 00:05 UTC Sunday
 * (cron/rebalanceCron.ts) — this runs 5 minutes earlier.
 */
export function startDigestCron() {
  return cron.schedule("0 0 * * 0", async () => {
    const digest = await generateAndDeliverWeeklyDigest();
    console.info(`[digest] generated for week starting ${digest.weekStart.toISOString()}, delivered=${digest.delivered}`);
  });
}

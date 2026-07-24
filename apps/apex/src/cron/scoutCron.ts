import cron from "node-cron";
import { runScout, type SignalSource } from "@apex/scout";

/**
 * Weekly, alongside the rebalance cron (spec doesn't pin an exact
 * cadence for Scout itself — "standing radar" implies continuous, but
 * a concrete schedule has to be picked; Sunday matches the existing
 * rebalance/digest rhythm rather than adding a second one).
 *
 * No real SignalSource is wired up in this build (see
 * packages/scout/src/signalSource.ts) — this runs against whatever
 * sources are passed in, which is an empty list until one exists, so
 * it's a real no-op today rather than a fake success.
 */
export function startScoutCron(sources: SignalSource[] = []) {
  return cron.schedule("10 0 * * 0", async () => {
    const created = await runScout(sources);
    console.info(`[scout] created ${created.length} candidate(s), ${created.filter((c) => c.aboveThreshold).length} above threshold.`);
  });
}

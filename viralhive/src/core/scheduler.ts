import * as cron from "node-cron";
import type { Orchestrator } from "./orchestrator.js";
import { childLogger } from "./logger.js";

const log = childLogger("scheduler");

type ScheduledTask = ReturnType<typeof cron.schedule>;

/**
 * Cron-driven autonomous loop. For every campaign, schedules one job per
 * distinct "HH:mm" posting-window slot declared across its accounts. When a
 * slot fires, it runs the campaign IF autopilot is currently enabled for it
 * (config default, overridable at runtime via the start/stop_autopilot MCP
 * tools) — this is what lets the agent operate with zero human involvement
 * once started.
 */
export class Scheduler {
  private tasks: ScheduledTask[] = [];

  constructor(private orchestrator: Orchestrator) {}

  start() {
    const config = this.orchestrator.getConfig();
    const state = this.orchestrator.getState();

    for (const campaign of config.campaigns) {
      if (campaign.autopilot) state.setAutopilot(campaign.id, true);

      const accounts = config.accounts.filter((a) => campaign.accountIds.includes(a.id));
      const slots = new Map<string, string>(); // "HH:mm" -> timezone
      for (const account of accounts) {
        for (const slot of account.postingWindow) {
          if (!slots.has(slot)) slots.set(slot, account.timezone);
        }
      }

      for (const [slot, timezone] of slots) {
        const [hour, minute] = slot.split(":").map(Number);
        if (Number.isNaN(hour) || Number.isNaN(minute)) {
          log.warn({ campaignId: campaign.id, slot }, "skipping invalid posting window slot");
          continue;
        }
        const pattern = `${minute} ${hour} * * *`;
        const task = cron.schedule(
          pattern,
          async () => {
            if (!state.isAutopilotEnabled(campaign.id)) return;
            try {
              await this.orchestrator.runCampaignOnce(campaign.id);
            } catch (err) {
              log.error({ campaignId: campaign.id, err }, "scheduled campaign run failed");
              state.log("error", "scheduled campaign run failed", {
                campaignId: campaign.id,
                error: err instanceof Error ? err.message : String(err),
              });
            }
          },
          { timezone }
        );
        this.tasks.push(task);
        log.info({ campaignId: campaign.id, pattern, timezone }, "scheduled autopilot slot");
      }
    }

    log.info({ jobCount: this.tasks.length }, "scheduler started");
  }

  stop() {
    for (const task of this.tasks) task.stop();
    this.tasks = [];
    log.info("scheduler stopped");
  }
}

import * as cron from "node-cron";
import type { Orchestrator } from "./orchestrator.js";
import { childLogger } from "./logger.js";
import { resolvePostingSlots } from "../analytics/learningEngine.js";
import { collectAnalytics } from "../analytics/collector.js";
import { pollAndReplyToComments } from "../engagement/engagementAgent.js";
import { buildAgentsForAccounts } from "../platforms/registry.js";
import { buildCampaignProviders } from "../creative/providerFactory.js";

const log = childLogger("scheduler");

type ScheduledTask = ReturnType<typeof cron.schedule>;

const ANALYTICS_INTERVAL_CRON = "0 */2 * * *"; // every 2 hours
const ENGAGEMENT_INTERVAL_CRON = "*/15 * * * *"; // every 15 minutes
const SMART_RESCHEDULE_CRON = "5 0 * * *"; // 00:05 daily

/**
 * Cron-driven autonomous loop with four independent jobs:
 *
 * 1. Posting — one job per campaign posting-window slot. Fires
 *    Orchestrator.runCampaignOnce IF autopilot is enabled. When a campaign
 *    has smartScheduling on, slots are recomputed daily from learned
 *    engagement data instead of staying pinned to the static config window.
 * 2. Analytics collection — pulls fresh performance numbers for recent
 *    posts and feeds the learning engine.
 * 3. Engagement polling — answers prospect comments/questions.
 * 4. Smart reschedule — nightly recompute of learned posting slots.
 *
 * All four run with no human involvement once the daemon is started.
 */
export class Scheduler {
  private postingTasks = new Map<string, ScheduledTask[]>(); // campaignId -> tasks
  private utilityTasks: ScheduledTask[] = [];

  constructor(private orchestrator: Orchestrator) {}

  start() {
    const config = this.orchestrator.getConfig();
    const state = this.orchestrator.getState();

    for (const campaign of config.campaigns) {
      if (campaign.autopilot) state.setAutopilot(campaign.id, true);
      this.scheduleCampaignPosting(campaign.id);
    }

    const smartReschedule = cron.schedule(SMART_RESCHEDULE_CRON, () => {
      for (const campaign of config.campaigns) {
        if (campaign.smartScheduling) this.scheduleCampaignPosting(campaign.id);
      }
    });
    this.utilityTasks.push(smartReschedule);

    const analyticsTask = cron.schedule(ANALYTICS_INTERVAL_CRON, async () => {
      try {
        const agents = buildAgentsForAccounts(config.accounts);
        await collectAnalytics(state, agents);
      } catch (err) {
        log.error({ err }, "analytics collection cycle failed");
      }
    });
    this.utilityTasks.push(analyticsTask);

    const engagementTask = cron.schedule(ENGAGEMENT_INTERVAL_CRON, async () => {
      try {
        const agents = buildAgentsForAccounts(config.accounts);
        const providers = buildCampaignProviders(config);
        await pollAndReplyToComments(config, state, providers.llm, agents);
      } catch (err) {
        log.error({ err }, "engagement polling cycle failed");
      }
    });
    this.utilityTasks.push(engagementTask);

    const totalPosting = [...this.postingTasks.values()].reduce((n, t) => n + t.length, 0);
    log.info(
      { postingJobs: totalPosting, utilityJobs: this.utilityTasks.length },
      "scheduler started (posting + analytics + engagement + smart-reschedule)"
    );
  }

  /** (Re)computes and (re)registers posting cron jobs for one campaign, e.g. after learning new best times. */
  private scheduleCampaignPosting(campaignId: string) {
    const config = this.orchestrator.getConfig();
    const state = this.orchestrator.getState();
    const campaign = config.campaigns.find((c) => c.id === campaignId);
    if (!campaign) return;

    for (const task of this.postingTasks.get(campaignId) ?? []) task.stop();

    const accounts = config.accounts.filter((a) => campaign.accountIds.includes(a.id));
    const slots = new Map<string, string>(); // "HH:mm" -> timezone
    for (const account of accounts) {
      const window = campaign.smartScheduling ? resolvePostingSlots(state, account) : account.postingWindow;
      for (const slot of window) {
        if (!slots.has(slot)) slots.set(slot, account.timezone);
      }
    }

    const tasks: ScheduledTask[] = [];
    for (const [slot, timezone] of slots) {
      const [hour, minute] = slot.split(":").map(Number);
      if (Number.isNaN(hour) || Number.isNaN(minute)) {
        log.warn({ campaignId, slot }, "skipping invalid posting window slot");
        continue;
      }
      const pattern = `${minute} ${hour} * * *`;
      const task = cron.schedule(
        pattern,
        async () => {
          if (!state.isAutopilotEnabled(campaignId)) return;
          try {
            await this.orchestrator.runCampaignOnce(campaignId);
          } catch (err) {
            log.error({ campaignId, err }, "scheduled campaign run failed");
            state.log("error", "scheduled campaign run failed", {
              campaignId,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        },
        { timezone }
      );
      tasks.push(task);
      log.info({ campaignId, pattern, timezone, learned: campaign.smartScheduling }, "scheduled posting slot");
    }
    this.postingTasks.set(campaignId, tasks);
  }

  stop() {
    for (const tasks of this.postingTasks.values()) for (const t of tasks) t.stop();
    for (const t of this.utilityTasks) t.stop();
    this.postingTasks.clear();
    this.utilityTasks = [];
    log.info("scheduler stopped");
  }
}

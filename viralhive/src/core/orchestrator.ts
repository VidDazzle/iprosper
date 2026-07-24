import type { AppConfig, CampaignConfig, PostResult } from "../config/types.js";
import { StateStore } from "./state.js";
import { childLogger } from "./logger.js";
import { withRetry, ConcurrencyLimiter } from "./queue.js";
import { buildCampaignProviders } from "../creative/providerFactory.js";
import { VideoPipeline } from "../creative/videoPipeline.js";
import { LLMTrendSource } from "../creative/trendEngine.js";
import { runQualityGate } from "../quality/qualityGate.js";
import { buildAgentsForAccounts } from "../platforms/registry.js";
import { resolveTopPerformers } from "../analytics/learningEngine.js";
import { createCheckoutLink } from "../commerce/checkout.js";
import { withCheckoutCta } from "../commerce/productPlacement.js";

const log = childLogger("orchestrator");

export interface CampaignRunSummary {
  campaignId: string;
  contentItemId?: string;
  qualityPassed: boolean;
  postResults: PostResult[];
}

/**
 * Owns config + persisted state and drives one end-to-end cycle per
 * campaign: idea -> script -> render -> quality gate -> fan out to every
 * configured account's platform agent. This is the single call both the MCP
 * "run_campaign_now" tool and the unattended scheduler invoke — there is no
 * separate "autonomous" code path that skips quality/policy checks.
 */
export class Orchestrator {
  private postLimiter = new ConcurrencyLimiter(3);

  constructor(private config: AppConfig, private state: StateStore) {}

  getConfig() {
    return this.config;
  }

  getState() {
    return this.state;
  }

  findCampaign(campaignId: string): CampaignConfig {
    const campaign = this.config.campaigns.find((c) => c.id === campaignId);
    if (!campaign) throw new Error(`Unknown campaign "${campaignId}"`);
    return campaign;
  }

  async runCampaignOnce(campaignId: string): Promise<CampaignRunSummary> {
    const campaign = this.findCampaign(campaignId);
    log.info({ campaignId }, "starting campaign run");

    const providers = buildCampaignProviders(this.config);
    const pipeline = new VideoPipeline({
      llm: providers.llm,
      video: providers.video,
      voice: providers.voice,
      trends: new LLMTrendSource(providers.llm),
    });

    const product = campaign.productId ? this.config.products.find((p) => p.id === campaign.productId) : undefined;
    const topPerformers = resolveTopPerformers(this.state, campaignId);

    let gateResult = await withRetry(`quality-gate:${campaignId}`, () =>
      runQualityGate(pipeline, campaign, providers.llm, providers.virality, { topPerformers, product })
    );

    if (gateResult.passed && product) {
      try {
        const checkoutUrl = await createCheckoutLink(this.config.commerce, product, {
          campaignId,
          accountId: campaignId,
          contentItemId: gateResult.item.id,
        });
        gateResult = { ...gateResult, item: { ...gateResult.item, brief: withCheckoutCta(gateResult.item.brief, checkoutUrl) } };
      } catch (err) {
        log.warn({ campaignId, err }, "checkout link creation failed; posting without a shoppable CTA");
      }
    }

    this.state.saveContentItem(gateResult.item);

    if (!gateResult.passed) {
      log.warn({ campaignId, itemId: gateResult.item.id }, "content rejected by quality gate; skipping post");
      this.state.log("warn", "content rejected by quality gate", { campaignId, itemId: gateResult.item.id });
      return { campaignId, contentItemId: gateResult.item.id, qualityPassed: false, postResults: [] };
    }

    const accounts = this.config.accounts.filter((a) => campaign.accountIds.includes(a.id));
    const agents = buildAgentsForAccounts(accounts);

    const postResults = await Promise.all(
      agents.map((agent) =>
        this.postLimiter.run(async () => {
          const account = agent.account;
          const dailyCount = this.state.incrementAndGetDailyCount(campaignId, account.id);
          if (dailyCount > account.postsPerDay) {
            log.info({ campaignId, accountId: account.id, dailyCount }, "daily post cap reached; skipping");
            return {
              accountId: account.id,
              platform: agent.platform,
              contentItemId: gateResult.item.id,
              success: false,
              error: "daily post cap reached",
              postedAt: new Date().toISOString(),
            } satisfies PostResult;
          }

          const result = await withRetry(`post:${account.id}`, () => agent.post(gateResult.item), {
            maxAttempts: 3,
            baseDelayMs: 3000,
          }).catch((err) => ({
            accountId: account.id,
            platform: agent.platform,
            contentItemId: gateResult.item.id,
            success: false,
            error: err instanceof Error ? err.message : String(err),
            postedAt: new Date().toISOString(),
          } satisfies PostResult));

          this.state.recordPost(result);
          this.state.log(result.success ? "info" : "error", "post attempt finished", result);
          return result;
        })
      )
    );

    const posted = { ...gateResult.item, status: "posted" as const };
    this.state.saveContentItem(posted);

    log.info(
      { campaignId, succeeded: postResults.filter((r) => r.success).length, total: postResults.length },
      "campaign run complete"
    );

    return { campaignId, contentItemId: gateResult.item.id, qualityPassed: true, postResults };
  }

  startAutopilot(campaignId: string) {
    this.findCampaign(campaignId);
    this.state.setAutopilot(campaignId, true);
    log.info({ campaignId }, "autopilot enabled");
  }

  stopAutopilot(campaignId: string) {
    this.findCampaign(campaignId);
    this.state.setAutopilot(campaignId, false);
    log.info({ campaignId }, "autopilot disabled");
  }
}

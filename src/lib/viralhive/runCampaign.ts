import type { PostResult } from "viralhive/config/types";
import { buildAppConfigFromDb, getCampaignProviderSelection } from "./dbConfig";
import * as state from "./dbState";

export interface CampaignRunSummary {
  campaignId: string;
  contentItemId?: string;
  qualityPassed: boolean;
  postResults: PostResult[];
}

/**
 * The web equivalent of the standalone CLI's Orchestrator.runCampaignOnce —
 * same flow (idea -> script -> render -> quality gate -> commerce -> fan out
 * to every account's platform agent), same engine code, DB-backed state
 * instead of SQLite. Uses dynamic imports so LOG_PRETTY can be forced off
 * (no worker-thread pino transport in a serverless function) before the
 * engine's logger module is ever evaluated.
 */
export async function runCampaignOnceWeb(campaignId: string): Promise<CampaignRunSummary> {
  process.env.LOG_PRETTY = "false";

  const [{ buildCampaignProviders }, { VideoPipeline }, { LLMTrendSource }, { runQualityGate }, { buildAgentsForAccounts }, { createCheckoutLink }, { withCheckoutCta }] =
    await Promise.all([
      import("viralhive/creative/providerFactory"),
      import("viralhive/creative/videoPipeline"),
      import("viralhive/creative/trendEngine"),
      import("viralhive/quality/qualityGate"),
      import("viralhive/platforms/registry"),
      import("viralhive/commerce/checkout"),
      import("viralhive/commerce/productPlacement"),
    ]);

  const config = await buildAppConfigFromDb();
  const campaign = config.campaigns.find((c) => c.id === campaignId);
  if (!campaign) throw new Error(`Unknown campaign "${campaignId}"`);

  const providerSelection = await getCampaignProviderSelection(campaignId);
  const providers = buildCampaignProviders({ ...config, providers: providerSelection });

  const pipeline = new VideoPipeline({
    llm: providers.llm,
    video: providers.video,
    voice: providers.voice,
    trends: new LLMTrendSource(providers.llm),
  });

  const product = campaign.productId ? config.products.find((p) => p.id === campaign.productId) : undefined;
  const topPerformers = await state.getTopPerformingTopics(campaignId, 5);

  let gateResult = await runQualityGate(pipeline, campaign, providers.llm, providers.virality, {
    topPerformers,
    product,
  });

  if (gateResult.passed && product) {
    try {
      const checkoutUrl = await createCheckoutLink(config.commerce, product, {
        campaignId,
        accountId: campaignId,
        contentItemId: gateResult.item.id,
      });
      gateResult = {
        ...gateResult,
        item: { ...gateResult.item, brief: withCheckoutCta(gateResult.item.brief, checkoutUrl) },
      };
    } catch (err) {
      await state.logEvent("warn", "checkout link creation failed; posting without a shoppable CTA", {
        campaignId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  await state.saveContentItem(gateResult.item);

  if (!gateResult.passed) {
    await state.logEvent("warn", "content rejected by quality gate", { campaignId, itemId: gateResult.item.id });
    return { campaignId, contentItemId: gateResult.item.id, qualityPassed: false, postResults: [] };
  }

  const accounts = config.accounts.filter((a) => campaign.accountIds.includes(a.id));
  const agents = buildAgentsForAccounts(accounts);

  const postResults: PostResult[] = [];
  for (const agent of agents) {
    const dailyCount = await state.incrementAndGetDailyCount(campaignId, agent.account.id);
    if (dailyCount > agent.account.postsPerDay) {
      postResults.push({
        accountId: agent.account.id,
        platform: agent.platform,
        contentItemId: gateResult.item.id,
        success: false,
        error: "daily post cap reached",
        postedAt: new Date().toISOString(),
      });
      continue;
    }

    const result = await agent.post(gateResult.item).catch(
      (err): PostResult => ({
        accountId: agent.account.id,
        platform: agent.platform,
        contentItemId: gateResult.item.id,
        success: false,
        error: err instanceof Error ? err.message : String(err),
        postedAt: new Date().toISOString(),
      })
    );
    await state.recordPost(result);
    await state.logEvent(result.success ? "info" : "error", "post attempt finished", result);
    postResults.push(result);
  }

  await state.saveContentItem({ ...gateResult.item, status: "posted" });

  return { campaignId, contentItemId: gateResult.item.id, qualityPassed: true, postResults };
}

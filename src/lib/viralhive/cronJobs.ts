import { buildAppConfigFromDb, getCampaignProviderSelection } from "./dbConfig";
import * as state from "./dbState";

/**
 * Web equivalents of the standalone daemon's periodic Scheduler jobs
 * (analytics collection, engagement polling, due-campaign posting), run by
 * a single Vercel Cron hit instead of node-cron — see /api/viralhive/cron.
 */

export async function collectAnalyticsWeb() {
  process.env.LOG_PRETTY = "false";
  const { buildAgentsForAccounts } = await import("viralhive/platforms/registry");

  const config = await buildAppConfigFromDb();
  const agents = buildAgentsForAccounts(config.accounts);
  const posts = await state.listPostsForMetricsCollection(14, 200);

  let checked = 0;
  for (const post of posts) {
    const agent = agents.find((a) => a.account.id === post.accountId);
    if (!agent?.fetchMetrics || !post.remoteId) continue;
    try {
      const snapshot = await agent.fetchMetrics(post.remoteId, post.id);
      await state.recordEngagementSnapshot(snapshot);
      const score = state.computeEngagementScore(snapshot);
      await state.recordEngagementScoreForContentItem(post.contentItemId, score);
      await state.recordTimingSample(post.accountId, post.postedAt, score);
      checked++;
    } catch (err) {
      await state.logEvent("warn", "metrics fetch failed", {
        accountId: post.accountId,
        postId: post.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return { postsChecked: checked };
}

export async function pollEngagementWeb() {
  process.env.LOG_PRETTY = "false";
  const [{ buildAgentsForAccounts }, { checkPolicyCompliance }] = await Promise.all([
    import("viralhive/platforms/registry"),
    import("viralhive/quality/policyFilter"),
  ]);

  const config = await buildAppConfigFromDb();
  const agents = buildAgentsForAccounts(config.accounts);
  let repliesSent = 0;

  for (const campaign of config.campaigns.filter((c) => c.engagementAutoReply)) {
    const { buildCampaignProviders } = await import("viralhive/creative/providerFactory");
    const providerSelection = await getCampaignProviderSelection(campaign.id);
    const providers = buildCampaignProviders({ ...config, providers: providerSelection });
    const product = campaign.productId ? config.products.find((p) => p.id === campaign.productId) : undefined;

    const campaignAgents = agents.filter((a) => campaign.accountIds.includes(a.account.id));
    const recentPosts = (await state.listPostsForMetricsCollection(7, 200)).filter(
      (p) => p.campaignId === campaign.id
    );

    for (const post of recentPosts) {
      const agent = campaignAgents.find((a) => a.account.id === post.accountId);
      if (!agent?.fetchRecentComments || !agent.replyToComment || !post.remoteId) continue;

      let comments;
      try {
        comments = await agent.fetchRecentComments(post.remoteId);
      } catch (err) {
        await state.logEvent("warn", "failed to fetch comments", {
          accountId: post.accountId,
          error: err instanceof Error ? err.message : String(err),
        });
        continue;
      }

      for (const comment of comments) {
        if (await state.isCommentHandled(comment.id)) continue;
        await state.markCommentHandled(comment.id);

        const decision = await classifyAndDraftReply(providers.llm, campaign, comment.text, product);
        if (!decision.shouldReply || !decision.reply) continue;

        const policy = await checkPolicyCompliance(
          { campaignId: campaign.id, topic: "", hook: "", script: "", caption: decision.reply, hashtags: [] },
          campaign,
          providers.llm
        );
        if (!policy.compliant) continue;

        try {
          await agent.replyToComment(post.remoteId, comment.id, decision.reply);
          await state.logEvent("info", "auto-replied to comment", { accountId: post.accountId, commentId: comment.id });
          repliesSent++;
        } catch (err) {
          await state.logEvent("error", "failed to post reply", {
            commentId: comment.id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }
  }
  return { repliesSent };
}

async function classifyAndDraftReply(
  llm: import("viralhive/creative/types").LLMProvider,
  campaign: import("viralhive/config/types").CampaignConfig,
  commentText: string,
  product?: import("viralhive/config/types").Product
) {
  const raw = await llm.chat(
    [
      {
        role: "system",
        content:
          "You triage and answer comments on a brand's social videos. Reply only to genuine questions, " +
          "purchase intent, or friendly engagement worth a response — never to spam, bots, insults, or " +
          "irrelevant noise. Keep replies short (under 300 characters), on-brand. " +
          'Respond with strict JSON only: {"shouldReply": boolean, "reply": string, "isSalesInquiry": boolean}',
      },
      {
        role: "user",
        content: [
          `Brand tone: ${campaign.toneKeywords.join(", ") || "friendly, helpful"}`,
          product ? `Product available for sale, mention naturally if relevant: "${product.name}" — ${product.description}` : "",
          `Comment: "${commentText}"`,
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
    { json: true, maxTokens: 300 }
  );
  try {
    const parsed = JSON.parse(raw);
    return {
      shouldReply: !!parsed.shouldReply,
      reply: String(parsed.reply ?? "").slice(0, 500),
      isSalesInquiry: !!parsed.isSalesInquiry,
    };
  } catch {
    return { shouldReply: false, reply: "", isSalesInquiry: false };
  }
}

/** Which autopilot-enabled campaigns are due to post right now, honoring smartScheduling learned slots. */
export async function findDueCampaigns(): Promise<string[]> {
  const config = await buildAppConfigFromDb();
  const now = new Date();
  const due: string[] = [];

  for (const campaign of config.campaigns) {
    const enabled = await state.isAutopilotEnabled(campaign.id, campaign.autopilot);
    if (!enabled) continue;

    const accounts = config.accounts.filter((a) => campaign.accountIds.includes(a.id));
    let isDue = false;
    for (const account of accounts) {
      const slots = campaign.smartScheduling
        ? (await state.getLearnedSlots(account.id, account.postingWindow.length || 1)) ?? account.postingWindow
        : account.postingWindow;
      const nowInZone = new Date(now.toLocaleString("en-US", { timeZone: account.timezone }));
      const currentSlot = `${String(nowInZone.getHours()).padStart(2, "0")}:00`;
      // Cron granularity is hourly; a slot is "due" if it falls in the current hour.
      if (slots.some((s) => s.startsWith(currentSlot.slice(0, 2)))) {
        isDue = true;
        break;
      }
    }
    if (isDue) due.push(campaign.id);
  }
  return due;
}

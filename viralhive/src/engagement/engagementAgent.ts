import type { AppConfig, CampaignConfig, Product } from "../config/types.js";
import type { StateStore } from "../core/state.js";
import type { LLMProvider } from "../creative/types.js";
import type { SocialPlatformAgent } from "../platforms/types.js";
import { checkPolicyCompliance } from "../quality/policyFilter.js";
import { childLogger } from "../core/logger.js";

const log = childLogger("engagement-agent");

/**
 * Polls every recent post for new comments and answers the ones worth
 * answering — questions, purchase intent, genuine engagement — while
 * ignoring spam/noise. Runs on the same schedule as everything else with no
 * human approval step; the safety net is the same policy filter the
 * quality gate uses, applied to the drafted reply before it's ever posted.
 */
export async function pollAndReplyToComments(
  config: AppConfig,
  state: StateStore,
  llm: LLMProvider,
  agents: SocialPlatformAgent[]
) {
  for (const campaign of config.campaigns.filter((c) => c.engagementAutoReply)) {
    const product = campaign.productId ? config.products.find((p) => p.id === campaign.productId) : undefined;
    const campaignAgents = agents.filter((a) => campaign.accountIds.includes(a.account.id));
    const recentPosts = state
      .listPostsForMetricsCollection(7, 200)
      .filter((p) => p.campaignId === campaign.id);

    for (const post of recentPosts) {
      const agent = campaignAgents.find((a) => a.account.id === post.accountId);
      if (!agent?.fetchRecentComments || !agent.replyToComment || !post.remoteId) continue;

      let comments;
      try {
        comments = await agent.fetchRecentComments(post.remoteId);
      } catch (err) {
        log.warn({ err, accountId: post.accountId }, "failed to fetch comments");
        continue;
      }

      for (const comment of comments) {
        if (state.isCommentHandled(comment.id)) continue;
        // Mark handled before attempting a reply so a crash mid-loop can never double-reply.
        state.markCommentHandled(comment.id);

        const decision = await classifyAndDraftReply(llm, campaign, comment.text, product);
        if (!decision.shouldReply || !decision.reply) continue;

        const policy = await checkPolicyCompliance(
          { campaignId: campaign.id, topic: "", hook: "", script: "", caption: decision.reply, hashtags: [] },
          campaign,
          llm
        );
        if (!policy.compliant) {
          log.warn({ commentId: comment.id, reasons: policy.reasons }, "drafted reply failed policy check; skipping");
          continue;
        }

        try {
          await agent.replyToComment(post.remoteId, comment.id, decision.reply);
          state.log("info", "auto-replied to comment", {
            accountId: post.accountId,
            commentId: comment.id,
            isSalesInquiry: decision.isSalesInquiry,
          });
        } catch (err) {
          log.error({ err, commentId: comment.id }, "failed to post reply");
        }
      }
    }
  }
}

interface ReplyDecision {
  shouldReply: boolean;
  reply: string;
  isSalesInquiry: boolean;
}

async function classifyAndDraftReply(
  llm: LLMProvider,
  campaign: CampaignConfig,
  commentText: string,
  product?: Product
): Promise<ReplyDecision> {
  const raw = await llm.chat(
    [
      {
        role: "system",
        content:
          "You triage and answer comments on a brand's social videos. Reply only to genuine questions, " +
          "purchase intent, or friendly engagement worth a response — never to spam, bots, insults, or " +
          "irrelevant noise. Keep replies short (under 300 characters), on-brand, and never make claims " +
          "you can't back up or promise things (refunds, guarantees) you have no authority over. " +
          'Respond with strict JSON only: {"shouldReply": boolean, "reply": string, "isSalesInquiry": boolean}',
      },
      {
        role: "user",
        content: [
          `Brand tone: ${campaign.toneKeywords.join(", ") || "friendly, helpful"}`,
          product
            ? `Product available for sale, mention naturally if relevant (link is already in bio/caption, don't fabricate one): "${product.name}" — ${product.description}`
            : "",
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

import { StateStore } from "../core/state.js";
import type { SocialPlatformAgent } from "../platforms/types.js";
import { childLogger } from "../core/logger.js";

const log = childLogger("analytics-collector");

/**
 * Pulls fresh performance numbers for every recent post via each platform
 * agent's optional fetchMetrics(), then feeds them into the two places that
 * make the system "self-optimizing": the per-content-item engagement score
 * (biases future ideation toward what works) and the per-account timing
 * histogram (biases the scheduler toward when it works).
 */
export async function collectAnalytics(state: StateStore, agents: SocialPlatformAgent[]) {
  const posts = state.listPostsForMetricsCollection(14, 200);

  for (const post of posts) {
    const agent = agents.find((a) => a.account.id === post.accountId);
    if (!agent?.fetchMetrics || !post.remoteId) continue;

    try {
      const snapshot = await agent.fetchMetrics(post.remoteId, post.id);
      state.recordEngagementSnapshot(snapshot);

      const score = StateStore.computeEngagementScore(snapshot);
      state.recordEngagementScoreForContentItem(post.contentItemId, score);
      state.recordTimingSample(post.accountId, post.postedAt, score);
    } catch (err) {
      log.warn({ err, accountId: post.accountId, postId: post.id }, "metrics fetch failed");
    }
  }

  log.info({ postsChecked: posts.length }, "analytics collection cycle complete");
}

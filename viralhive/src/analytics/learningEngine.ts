import type { AccountConfig } from "../config/types.js";
import type { StateStore } from "../core/state.js";

/**
 * The "learns and improves" layer, in full: two feedback loops built directly
 * on top of collected engagement data (src/analytics/collector.ts), nothing
 * more mystical than that.
 *
 * 1. Timing — src/core/state.ts keeps a running per-account, per-hour
 *    engagement average. Once an hour has at least a few samples, it's
 *    eligible to be picked as a "learned slot."
 * 2. Content — the highest-scoring past topics/hooks for a campaign are fed
 *    back into ideation (src/creative/scriptWriter.ts's topPerformers) so
 *    future ideas lean into what has actually resonated.
 */

/** Returns the account's best-performing posting times, falling back to the
 *  configured static window until enough engagement data has been collected. */
export function resolvePostingSlots(state: StateStore, account: AccountConfig): string[] {
  const learned = state.getLearnedSlots(account.id, account.postingWindow.length || 1);
  return learned ?? account.postingWindow;
}

/** Best-performing historical topics/hooks for a campaign, for feeding into ideation. */
export function resolveTopPerformers(state: StateStore, campaignId: string, limit = 5): string[] {
  return state.getTopPerformingTopics(campaignId, limit);
}

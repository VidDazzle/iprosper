import type { AccountConfig, ContentItem, EngagementSnapshot, InboundComment, Platform, PostResult } from "../config/types.js";

/** One instance per configured social account — the "one agent per account" unit. */
export interface SocialPlatformAgent {
  readonly platform: Platform;
  readonly account: AccountConfig;
  post(item: ContentItem): Promise<PostResult>;

  /** Comment/DM support for the prospect-engagement loop. Optional: not every
   *  platform integration implements this yet (e.g. the generic webhook agent). */
  fetchRecentComments?(remotePostId: string): Promise<InboundComment[]>;
  replyToComment?(remotePostId: string, commentId: string, text: string): Promise<void>;

  /** Post performance for the analytics/learning loop. Optional for the same reason. */
  fetchMetrics?(remotePostId: string, postId: string): Promise<EngagementSnapshot>;
}

export function ok(account: AccountConfig, platform: Platform, item: ContentItem, remoteId: string, remoteUrl?: string): PostResult {
  return {
    accountId: account.id,
    platform,
    contentItemId: item.id,
    success: true,
    remoteId,
    remoteUrl,
    postedAt: new Date().toISOString(),
  };
}

export function fail(account: AccountConfig, platform: Platform, item: ContentItem, error: unknown): PostResult {
  return {
    accountId: account.id,
    platform,
    contentItemId: item.id,
    success: false,
    error: error instanceof Error ? error.message : String(error),
    postedAt: new Date().toISOString(),
  };
}

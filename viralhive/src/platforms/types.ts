import type { AccountConfig, ContentItem, Platform, PostResult } from "../config/types.js";

/** One instance per configured social account — the "one agent per account" unit. */
export interface SocialPlatformAgent {
  readonly platform: Platform;
  readonly account: AccountConfig;
  post(item: ContentItem): Promise<PostResult>;
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

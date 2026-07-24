import type { AccountConfig, ContentItem, EngagementSnapshot, InboundComment, PostResult } from "../config/types.js";
import { resolveCredentials } from "../config/config.js";
import type { SocialPlatformAgent } from "./types.js";
import { ok, fail } from "./types.js";
import { childLogger } from "../core/logger.js";

const log = childLogger("facebook-agent");

/**
 * Meta Graph API video/Reels publishing to a Facebook Page
 * (https://developers.facebook.com/docs/video-api).
 *
 * Required account.credentials env vars:
 *   pageAccessToken -> FB_<ACCOUNT>_PAGE_TOKEN
 *   pageId          -> FB_<ACCOUNT>_PAGE_ID
 */
export class FacebookAgent implements SocialPlatformAgent {
  readonly platform = "facebook" as const;
  private apiVersion = "v21.0";
  constructor(public account: AccountConfig) {}

  async post(item: ContentItem): Promise<PostResult> {
    const { pageAccessToken, pageId } = resolveCredentials(this.account.credentials);
    if (!item.videoAssetUrl) return fail(this.account, this.platform, item, "no video asset to post");

    try {
      const description = [item.brief.caption, item.brief.hashtags.join(" ")].filter(Boolean).join("\n\n");

      const res = await fetch(`https://graph-video.facebook.com/${this.apiVersion}/${pageId}/videos`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          file_url: item.videoAssetUrl,
          description,
          title: item.brief.topic,
          access_token: pageAccessToken,
        }),
      });
      const data = (await res.json()) as any;
      if (!res.ok) throw new Error(`Facebook video publish failed: ${JSON.stringify(data)}`);

      log.info({ account: this.account.id, videoId: data.id }, "facebook video published");
      return ok(this.account, this.platform, item, data.id, `https://facebook.com/${data.id}`);
    } catch (err) {
      return fail(this.account, this.platform, item, err);
    }
  }

  async fetchRecentComments(remotePostId: string): Promise<InboundComment[]> {
    const { pageAccessToken } = resolveCredentials(this.account.credentials);
    const res = await fetch(
      `https://graph.facebook.com/${this.apiVersion}/${remotePostId}/comments?fields=id,message,from,created_time&access_token=${pageAccessToken}`
    );
    const data = (await res.json()) as any;
    if (!res.ok) throw new Error(`Facebook comments fetch failed: ${JSON.stringify(data)}`);
    return (data.data ?? []).map((c: any) => ({
      id: c.id,
      platform: this.platform,
      accountId: this.account.id,
      postRemoteId: remotePostId,
      authorHandle: c.from?.name ?? "unknown",
      text: c.message,
      createdAt: c.created_time ?? new Date().toISOString(),
    }));
  }

  async replyToComment(_remotePostId: string, commentId: string, text: string): Promise<void> {
    const { pageAccessToken } = resolveCredentials(this.account.credentials);
    const res = await fetch(`https://graph.facebook.com/${this.apiVersion}/${commentId}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: text, access_token: pageAccessToken }),
    });
    if (!res.ok) throw new Error(`Facebook comment reply failed: ${res.status} ${await res.text()}`);
  }

  async fetchMetrics(remotePostId: string, postId: string): Promise<EngagementSnapshot> {
    const { pageAccessToken } = resolveCredentials(this.account.credentials);
    const res = await fetch(
      `https://graph.facebook.com/${this.apiVersion}/${remotePostId}?fields=likes.summary(true),comments.summary(true),shares&access_token=${pageAccessToken}`
    );
    const data = (await res.json()) as any;
    if (!res.ok) throw new Error(`Facebook metrics fetch failed: ${JSON.stringify(data)}`);
    return {
      postId,
      accountId: this.account.id,
      platform: this.platform,
      views: 0, // requires video_insights with a video-specific token scope; not exposed on the basic fields call.
      likes: data.likes?.summary?.total_count ?? 0,
      comments: data.comments?.summary?.total_count ?? 0,
      shares: data.shares?.count ?? 0,
      clicks: 0,
      newFollowers: 0,
      collectedAt: new Date().toISOString(),
    };
  }
}

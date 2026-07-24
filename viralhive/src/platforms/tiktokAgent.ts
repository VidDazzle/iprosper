import type { AccountConfig, ContentItem, EngagementSnapshot, InboundComment, PostResult } from "../config/types.js";
import { resolveCredentials } from "../config/config.js";
import type { SocialPlatformAgent } from "./types.js";
import { ok, fail } from "./types.js";
import { childLogger } from "../core/logger.js";

const log = childLogger("tiktok-agent");

/**
 * TikTok Content Posting API (https://developers.tiktok.com/doc/content-posting-api-get-started).
 * Requires an app with the `video.publish` scope and a long-lived access
 * token per creator account (refreshed out-of-band — TikTok tokens expire
 * every 24h and must be rotated via the refresh_token flow).
 *
 * Required account.credentials env vars:
 *   accessToken -> TIKTOK_<ACCOUNT>_ACCESS_TOKEN
 */
export class TikTokAgent implements SocialPlatformAgent {
  readonly platform = "tiktok" as const;
  constructor(public account: AccountConfig) {}

  async post(item: ContentItem): Promise<PostResult> {
    const { accessToken } = resolveCredentials(this.account.credentials);
    if (!item.videoAssetUrl) return fail(this.account, this.platform, item, "no video asset to post");

    try {
      const initRes = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          post_info: {
            title: item.brief.caption,
            privacy_level: "PUBLIC_TO_EVERYONE",
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
          },
          source_info: {
            source: "PULL_FROM_URL",
            video_url: item.videoAssetUrl,
          },
        }),
      });

      const data = (await initRes.json()) as any;
      if (!initRes.ok || data.error?.code !== "ok") {
        throw new Error(`TikTok publish/init failed: ${initRes.status} ${JSON.stringify(data)}`);
      }

      const publishId = data.data.publish_id as string;
      log.info({ account: this.account.id, publishId }, "tiktok publish initiated");
      return ok(this.account, this.platform, item, publishId);
    } catch (err) {
      return fail(this.account, this.platform, item, err);
    }
  }

  // NOTE: TikTok's comment-management surface has moved around across API
  // versions; verify these paths against current docs before relying on them.
  async fetchRecentComments(remotePostId: string): Promise<InboundComment[]> {
    const { accessToken } = resolveCredentials(this.account.credentials);
    const res = await fetch("https://open.tiktokapis.com/v2/video/comment/list/", {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      body: JSON.stringify({ video_id: remotePostId, count: 20 }),
    });
    const data = (await res.json()) as any;
    if (!res.ok) throw new Error(`TikTok comment list failed: ${JSON.stringify(data)}`);
    return (data.data?.comments ?? []).map((c: any) => ({
      id: c.comment_id,
      platform: this.platform,
      accountId: this.account.id,
      postRemoteId: remotePostId,
      authorHandle: c.user?.display_name ?? "unknown",
      text: c.text,
      createdAt: new Date((c.create_time ?? Date.now() / 1000) * 1000).toISOString(),
    }));
  }

  async replyToComment(remotePostId: string, commentId: string, text: string): Promise<void> {
    const { accessToken } = resolveCredentials(this.account.credentials);
    const res = await fetch("https://open.tiktokapis.com/v2/video/comment/reply/", {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      body: JSON.stringify({ video_id: remotePostId, comment_id: commentId, text }),
    });
    if (!res.ok) throw new Error(`TikTok comment reply failed: ${res.status} ${await res.text()}`);
  }

  async fetchMetrics(remotePostId: string, postId: string): Promise<EngagementSnapshot> {
    const { accessToken } = resolveCredentials(this.account.credentials);
    const res = await fetch(
      "https://open.tiktokapis.com/v2/video/query/?fields=id,view_count,like_count,comment_count,share_count",
      {
        method: "POST",
        headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
        body: JSON.stringify({ filters: { video_ids: [remotePostId] } }),
      }
    );
    const data = (await res.json()) as any;
    if (!res.ok) throw new Error(`TikTok video query failed: ${JSON.stringify(data)}`);
    const video = data.data?.videos?.[0] ?? {};
    return {
      postId,
      accountId: this.account.id,
      platform: this.platform,
      views: video.view_count ?? 0,
      likes: video.like_count ?? 0,
      comments: video.comment_count ?? 0,
      shares: video.share_count ?? 0,
      clicks: 0,
      newFollowers: 0,
      collectedAt: new Date().toISOString(),
    };
  }
}

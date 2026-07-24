import type { AccountConfig, ContentItem, EngagementSnapshot, InboundComment, PostResult } from "../config/types.js";
import { resolveCredentials } from "../config/config.js";
import type { SocialPlatformAgent } from "./types.js";
import { ok, fail } from "./types.js";
import { childLogger } from "../core/logger.js";

const log = childLogger("instagram-agent");

/**
 * Meta Graph API Reels publishing (https://developers.facebook.com/docs/instagram-api/guides/content-publishing).
 * Two-step flow: create a media container from a hosted video URL, poll
 * until Meta finishes ingesting it, then publish the container.
 *
 * Required account.credentials env vars:
 *   accessToken -> IG_<ACCOUNT>_ACCESS_TOKEN (long-lived page/IG token)
 *   igUserId    -> IG_<ACCOUNT>_USER_ID
 */
export class InstagramAgent implements SocialPlatformAgent {
  readonly platform = "instagram" as const;
  private apiVersion = "v21.0";
  constructor(public account: AccountConfig) {}

  async post(item: ContentItem): Promise<PostResult> {
    const { accessToken, igUserId } = resolveCredentials(this.account.credentials);
    if (!item.videoAssetUrl) return fail(this.account, this.platform, item, "no video asset to post");

    try {
      const caption = [item.brief.caption, item.brief.hashtags.join(" ")].filter(Boolean).join("\n\n");

      const createRes = await fetch(
        `https://graph.facebook.com/${this.apiVersion}/${igUserId}/media`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            media_type: "REELS",
            video_url: item.videoAssetUrl,
            caption,
            access_token: accessToken,
          }),
        }
      );
      const created = (await createRes.json()) as any;
      if (!createRes.ok) throw new Error(`IG container create failed: ${JSON.stringify(created)}`);
      const containerId = created.id as string;

      await this.waitUntilReady(containerId, accessToken);

      const publishRes = await fetch(
        `https://graph.facebook.com/${this.apiVersion}/${igUserId}/media_publish`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ creation_id: containerId, access_token: accessToken }),
        }
      );
      const published = (await publishRes.json()) as any;
      if (!publishRes.ok) throw new Error(`IG publish failed: ${JSON.stringify(published)}`);

      log.info({ account: this.account.id, mediaId: published.id }, "instagram reel published");
      return ok(this.account, this.platform, item, published.id, `https://instagram.com/reel/${published.id}`);
    } catch (err) {
      return fail(this.account, this.platform, item, err);
    }
  }

  private async waitUntilReady(containerId: string, accessToken: string, timeoutMs = 5 * 60_000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const res = await fetch(
        `https://graph.facebook.com/${this.apiVersion}/${containerId}?fields=status_code&access_token=${accessToken}`
      );
      const data = (await res.json()) as any;
      if (data.status_code === "FINISHED") return;
      if (data.status_code === "ERROR") throw new Error("IG container processing failed");
      await new Promise((r) => setTimeout(r, 4000));
    }
    throw new Error(`IG container ${containerId} not ready after timeout`);
  }

  async fetchRecentComments(remotePostId: string): Promise<InboundComment[]> {
    const { accessToken } = resolveCredentials(this.account.credentials);
    const res = await fetch(
      `https://graph.facebook.com/${this.apiVersion}/${remotePostId}/comments?fields=id,text,username,timestamp&access_token=${accessToken}`
    );
    const data = (await res.json()) as any;
    if (!res.ok) throw new Error(`IG comments fetch failed: ${JSON.stringify(data)}`);
    return (data.data ?? []).map((c: any) => ({
      id: c.id,
      platform: this.platform,
      accountId: this.account.id,
      postRemoteId: remotePostId,
      authorHandle: c.username ?? "unknown",
      text: c.text,
      createdAt: c.timestamp ?? new Date().toISOString(),
    }));
  }

  async replyToComment(_remotePostId: string, commentId: string, text: string): Promise<void> {
    const { accessToken } = resolveCredentials(this.account.credentials);
    const res = await fetch(`https://graph.facebook.com/${this.apiVersion}/${commentId}/replies`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: text, access_token: accessToken }),
    });
    if (!res.ok) throw new Error(`IG comment reply failed: ${res.status} ${await res.text()}`);
  }

  async fetchMetrics(remotePostId: string, postId: string): Promise<EngagementSnapshot> {
    const { accessToken } = resolveCredentials(this.account.credentials);
    const res = await fetch(
      `https://graph.facebook.com/${this.apiVersion}/${remotePostId}/insights?metric=likes,comments,shares,saved,reach,ig_reels_avg_watch_time&access_token=${accessToken}`
    );
    const data = (await res.json()) as any;
    if (!res.ok) throw new Error(`IG insights fetch failed: ${JSON.stringify(data)}`);
    const metric = (name: string) => data.data?.find((m: any) => m.name === name)?.values?.[0]?.value ?? 0;
    return {
      postId,
      accountId: this.account.id,
      platform: this.platform,
      views: metric("reach"),
      likes: metric("likes"),
      comments: metric("comments"),
      shares: metric("shares"),
      clicks: 0, // Graph API doesn't expose link clicks for organic Reels; use commerce UTM data instead.
      newFollowers: 0, // not attributable to a single post via Graph API; requires Insights API account-level deltas.
      collectedAt: new Date().toISOString(),
    };
  }
}

import type { AccountConfig, ContentItem, EngagementSnapshot, InboundComment, PostResult } from "../config/types.js";
import { resolveCredentials } from "../config/config.js";
import type { SocialPlatformAgent } from "./types.js";
import { ok, fail } from "./types.js";
import { childLogger } from "../core/logger.js";

const log = childLogger("x-agent");

/**
 * X (Twitter) API v2 chunked media upload + tweet creation
 * (https://developer.x.com/en/docs/x-api/media-uploads).
 *
 * Required account.credentials env vars:
 *   accessToken -> X_<ACCOUNT>_ACCESS_TOKEN (OAuth2 user context with media.write, tweet.write)
 */
export class XAgent implements SocialPlatformAgent {
  readonly platform = "x" as const;
  constructor(public account: AccountConfig) {}

  async post(item: ContentItem): Promise<PostResult> {
    const { accessToken } = resolveCredentials(this.account.credentials);
    if (!item.videoAssetUrl) return fail(this.account, this.platform, item, "no video asset to post");

    try {
      const videoBytes = Buffer.from(await (await fetch(item.videoAssetUrl)).arrayBuffer());
      const mediaId = await this.chunkedUpload(videoBytes, accessToken);

      const text = [item.brief.hook, item.brief.caption, item.brief.hashtags.join(" ")]
        .filter(Boolean)
        .join("\n\n")
        .slice(0, 280);

      const res = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ text, media: { media_ids: [mediaId] } }),
      });
      const data = (await res.json()) as any;
      if (!res.ok) throw new Error(`X tweet create failed: ${JSON.stringify(data)}`);

      log.info({ account: this.account.id, tweetId: data.data.id }, "x post published");
      return ok(this.account, this.platform, item, data.data.id, `https://x.com/i/status/${data.data.id}`);
    } catch (err) {
      return fail(this.account, this.platform, item, err);
    }
  }

  private async chunkedUpload(video: Buffer, accessToken: string): Promise<string> {
    const authHeader = { authorization: `Bearer ${accessToken}` };

    const initRes = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
      method: "POST",
      headers: { ...authHeader, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        command: "INIT",
        total_bytes: String(video.byteLength),
        media_type: "video/mp4",
        media_category: "tweet_video",
      }),
    });
    const init = (await initRes.json()) as any;
    if (!initRes.ok) throw new Error(`X media INIT failed: ${JSON.stringify(init)}`);
    const mediaId = init.media_id_string as string;

    const chunkSize = 5 * 1024 * 1024;
    for (let offset = 0, index = 0; offset < video.byteLength; offset += chunkSize, index++) {
      const chunk = video.subarray(offset, offset + chunkSize);
      const form = new FormData();
      form.append("command", "APPEND");
      form.append("media_id", mediaId);
      form.append("segment_index", String(index));
      form.append("media", new Blob([chunk]));
      const appendRes = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
        method: "POST",
        headers: authHeader,
        body: form,
      });
      if (!appendRes.ok) throw new Error(`X media APPEND chunk ${index} failed: ${await appendRes.text()}`);
    }

    const finalizeRes = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
      method: "POST",
      headers: { ...authHeader, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ command: "FINALIZE", media_id: mediaId }),
    });
    const finalize = (await finalizeRes.json()) as any;
    if (!finalizeRes.ok) throw new Error(`X media FINALIZE failed: ${JSON.stringify(finalize)}`);

    let status = finalize.processing_info?.state;
    while (status && status !== "succeeded") {
      if (status === "failed") throw new Error(`X media processing failed: ${JSON.stringify(finalize)}`);
      await new Promise((r) => setTimeout(r, (finalize.processing_info?.check_after_secs ?? 3) * 1000));
      const statusRes = await fetch(
        `https://upload.twitter.com/1.1/media/upload.json?command=STATUS&media_id=${mediaId}`,
        { headers: authHeader }
      );
      const statusData = (await statusRes.json()) as any;
      status = statusData.processing_info?.state ?? "succeeded";
    }

    return mediaId;
  }

  async fetchRecentComments(remotePostId: string): Promise<InboundComment[]> {
    const { accessToken } = resolveCredentials(this.account.credentials);
    const query = encodeURIComponent(`conversation_id:${remotePostId} is:reply`);
    const res = await fetch(
      `https://api.twitter.com/2/tweets/search/recent?query=${query}&tweet.fields=author_id,created_at&max_results=20`,
      { headers: { authorization: `Bearer ${accessToken}` } }
    );
    const data = (await res.json()) as any;
    if (!res.ok) throw new Error(`X reply search failed: ${JSON.stringify(data)}`);
    return (data.data ?? []).map((t: any) => ({
      id: t.id,
      platform: this.platform,
      accountId: this.account.id,
      postRemoteId: remotePostId,
      authorHandle: t.author_id,
      text: t.text,
      createdAt: t.created_at ?? new Date().toISOString(),
    }));
  }

  async replyToComment(_remotePostId: string, commentId: string, text: string): Promise<void> {
    const { accessToken } = resolveCredentials(this.account.credentials);
    const res = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      body: JSON.stringify({ text: text.slice(0, 280), reply: { in_reply_to_tweet_id: commentId } }),
    });
    if (!res.ok) throw new Error(`X reply post failed: ${res.status} ${await res.text()}`);
  }

  async fetchMetrics(remotePostId: string, postId: string): Promise<EngagementSnapshot> {
    const { accessToken } = resolveCredentials(this.account.credentials);
    const res = await fetch(
      `https://api.twitter.com/2/tweets/${remotePostId}?tweet.fields=public_metrics`,
      { headers: { authorization: `Bearer ${accessToken}` } }
    );
    const data = (await res.json()) as any;
    if (!res.ok) throw new Error(`X tweet metrics fetch failed: ${JSON.stringify(data)}`);
    const m = data.data?.public_metrics ?? {};
    return {
      postId,
      accountId: this.account.id,
      platform: this.platform,
      views: m.impression_count ?? 0,
      likes: m.like_count ?? 0,
      comments: m.reply_count ?? 0,
      shares: m.retweet_count ?? 0,
      clicks: 0,
      newFollowers: 0,
      collectedAt: new Date().toISOString(),
    };
  }
}

import type { AccountConfig, ContentItem, EngagementSnapshot, InboundComment, PostResult } from "../config/types.js";
import { resolveCredentials } from "../config/config.js";
import type { SocialPlatformAgent } from "./types.js";
import { ok, fail } from "./types.js";
import { childLogger } from "../core/logger.js";

const log = childLogger("youtube-agent");

/**
 * YouTube Data API v3 resumable upload for Shorts
 * (https://developers.google.com/youtube/v3/guides/uploading_a_video).
 * A video is treated as a Short automatically when it's vertical/square and
 * under 3 minutes with #Shorts in the title or description.
 *
 * Required account.credentials env vars:
 *   accessToken -> YT_<ACCOUNT>_ACCESS_TOKEN (OAuth2, refreshed out-of-band via a
 *                  refresh_token — YouTube access tokens expire hourly)
 */
export class YouTubeAgent implements SocialPlatformAgent {
  readonly platform = "youtube" as const;
  constructor(public account: AccountConfig) {}

  async post(item: ContentItem): Promise<PostResult> {
    const { accessToken } = resolveCredentials(this.account.credentials);
    if (!item.videoAssetUrl) return fail(this.account, this.platform, item, "no video asset to post");

    try {
      const videoBytes = await (await fetch(item.videoAssetUrl)).arrayBuffer();

      const metadata = {
        snippet: {
          title: `${item.brief.topic} #Shorts`.slice(0, 100),
          description: [item.brief.caption, item.brief.hashtags.join(" "), "#Shorts"]
            .filter(Boolean)
            .join("\n\n"),
          tags: item.brief.hashtags.map((h) => h.replace(/^#/, "")),
          categoryId: "22",
        },
        status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
      };

      const initRes = await fetch(
        "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${accessToken}`,
            "content-type": "application/json; charset=UTF-8",
            "X-Upload-Content-Type": "video/mp4",
            "X-Upload-Content-Length": String(videoBytes.byteLength),
          },
          body: JSON.stringify(metadata),
        }
      );
      if (!initRes.ok) throw new Error(`YouTube resumable session init failed: ${initRes.status} ${await initRes.text()}`);
      const uploadUrl = initRes.headers.get("location");
      if (!uploadUrl) throw new Error("YouTube did not return a resumable upload URL");

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "content-type": "video/mp4",
          "content-length": String(videoBytes.byteLength),
        },
        body: Buffer.from(videoBytes),
      });
      const data = (await uploadRes.json()) as any;
      if (!uploadRes.ok) throw new Error(`YouTube upload failed: ${JSON.stringify(data)}`);

      log.info({ account: this.account.id, videoId: data.id }, "youtube short published");
      return ok(this.account, this.platform, item, data.id, `https://youtube.com/shorts/${data.id}`);
    } catch (err) {
      return fail(this.account, this.platform, item, err);
    }
  }

  async fetchRecentComments(remotePostId: string): Promise<InboundComment[]> {
    const { accessToken } = resolveCredentials(this.account.credentials);
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${remotePostId}&order=time&maxResults=20`,
      { headers: { authorization: `Bearer ${accessToken}` } }
    );
    const data = (await res.json()) as any;
    if (!res.ok) throw new Error(`YouTube commentThreads fetch failed: ${JSON.stringify(data)}`);
    return (data.items ?? []).map((t: any) => {
      const top = t.snippet.topLevelComment.snippet;
      return {
        id: t.snippet.topLevelComment.id,
        platform: this.platform,
        accountId: this.account.id,
        postRemoteId: remotePostId,
        authorHandle: top.authorDisplayName,
        text: top.textOriginal,
        createdAt: top.publishedAt,
      };
    });
  }

  async replyToComment(_remotePostId: string, commentId: string, text: string): Promise<void> {
    const { accessToken } = resolveCredentials(this.account.credentials);
    const res = await fetch("https://www.googleapis.com/youtube/v3/comments?part=snippet", {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      body: JSON.stringify({ snippet: { parentId: commentId, textOriginal: text } }),
    });
    if (!res.ok) throw new Error(`YouTube comment reply failed: ${res.status} ${await res.text()}`);
  }

  async fetchMetrics(remotePostId: string, postId: string): Promise<EngagementSnapshot> {
    const { accessToken } = resolveCredentials(this.account.credentials);
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${remotePostId}`,
      { headers: { authorization: `Bearer ${accessToken}` } }
    );
    const data = (await res.json()) as any;
    if (!res.ok) throw new Error(`YouTube statistics fetch failed: ${JSON.stringify(data)}`);
    const stats = data.items?.[0]?.statistics ?? {};
    return {
      postId,
      accountId: this.account.id,
      platform: this.platform,
      views: Number(stats.viewCount ?? 0),
      likes: Number(stats.likeCount ?? 0),
      comments: Number(stats.commentCount ?? 0),
      shares: 0, // requires the YouTube Analytics API (shares metric), not the Data API.
      clicks: 0,
      newFollowers: 0, // requires YouTube Analytics API's subscribersGained metric.
      collectedAt: new Date().toISOString(),
    };
  }
}

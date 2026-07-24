import type { AccountConfig, ContentItem, EngagementSnapshot, PostResult } from "../config/types.js";
import { resolveCredentials } from "../config/config.js";
import type { SocialPlatformAgent } from "./types.js";
import { ok, fail } from "./types.js";
import { childLogger } from "../core/logger.js";

const log = childLogger("pinterest-agent");

/**
 * Pinterest API v5 video Pin creation
 * (https://developers.pinterest.com/docs/api/v5/#operation/pins/create).
 *
 * Required account.credentials env vars:
 *   accessToken -> PIN_<ACCOUNT>_ACCESS_TOKEN
 *   boardId     -> PIN_<ACCOUNT>_BOARD_ID
 */
export class PinterestAgent implements SocialPlatformAgent {
  readonly platform = "pinterest" as const;
  constructor(public account: AccountConfig) {}

  async post(item: ContentItem): Promise<PostResult> {
    const { accessToken, boardId } = resolveCredentials(this.account.credentials);
    if (!item.videoAssetUrl) return fail(this.account, this.platform, item, "no video asset to post");

    try {
      const res = await fetch("https://api.pinterest.com/v5/pins", {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          board_id: boardId,
          title: item.brief.topic.slice(0, 100),
          description: [item.brief.caption, item.brief.hashtags.join(" ")].filter(Boolean).join("\n\n"),
          media_source: {
            source_type: "video_url",
            url: item.videoAssetUrl,
            cover_image_url: item.thumbnailUrl,
          },
        }),
      });
      const data = (await res.json()) as any;
      if (!res.ok) throw new Error(`Pinterest pin create failed: ${JSON.stringify(data)}`);

      log.info({ account: this.account.id, pinId: data.id }, "pinterest video pin published");
      return ok(this.account, this.platform, item, data.id, `https://pinterest.com/pin/${data.id}`);
    } catch (err) {
      return fail(this.account, this.platform, item, err);
    }
  }

  // Pinterest does not expose a general-purpose pin-comments API, so this
  // agent implements metrics only; prospect Q&A on Pinterest happens via the
  // messaging surface, which is out of scope for the engagement agent today.
  async fetchMetrics(remotePostId: string, postId: string): Promise<EngagementSnapshot> {
    const { accessToken } = resolveCredentials(this.account.credentials);
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    const params = new URLSearchParams({
      start_date: start.toISOString().slice(0, 10),
      end_date: end.toISOString().slice(0, 10),
      metric_types: "IMPRESSION,PIN_CLICK,OUTBOUND_CLICK,SAVE",
    });
    const res = await fetch(`https://api.pinterest.com/v5/pins/${remotePostId}/analytics?${params}`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const data = (await res.json()) as any;
    if (!res.ok) throw new Error(`Pinterest analytics fetch failed: ${JSON.stringify(data)}`);
    const totals = data.all?.summary_metrics ?? {};
    return {
      postId,
      accountId: this.account.id,
      platform: this.platform,
      views: totals.IMPRESSION ?? 0,
      likes: 0,
      comments: 0,
      shares: totals.SAVE ?? 0,
      clicks: (totals.PIN_CLICK ?? 0) + (totals.OUTBOUND_CLICK ?? 0),
      newFollowers: 0,
      collectedAt: new Date().toISOString(),
    };
  }
}

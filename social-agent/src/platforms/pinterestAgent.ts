import type { AccountConfig, ContentItem, PostResult } from "../config/types.js";
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
}

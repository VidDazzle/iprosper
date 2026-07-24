import type { AccountConfig, ContentItem, PostResult } from "../config/types.js";
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
}

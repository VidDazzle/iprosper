import type { AccountConfig, ContentItem, PostResult } from "../config/types.js";
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
}

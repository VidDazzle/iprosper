import type { AccountConfig, ContentItem, PostResult } from "../config/types.js";
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
}

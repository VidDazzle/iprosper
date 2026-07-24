import type { AccountConfig, ContentItem, PostResult } from "../config/types.js";
import { resolveCredentials } from "../config/config.js";
import type { SocialPlatformAgent } from "./types.js";
import { ok, fail } from "./types.js";
import { childLogger } from "../core/logger.js";

const log = childLogger("linkedin-agent");

/**
 * LinkedIn UGC Posts API with native video
 * (https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/video-api).
 *
 * Required account.credentials env vars:
 *   accessToken -> LI_<ACCOUNT>_ACCESS_TOKEN (w_member_social or w_organization_social scope)
 *   authorUrn   -> LI_<ACCOUNT>_AUTHOR_URN (e.g. urn:li:person:xxxx or urn:li:organization:xxxx)
 */
export class LinkedInAgent implements SocialPlatformAgent {
  readonly platform = "linkedin" as const;
  constructor(public account: AccountConfig) {}

  async post(item: ContentItem): Promise<PostResult> {
    const { accessToken, authorUrn } = resolveCredentials(this.account.credentials);
    if (!item.videoAssetUrl) return fail(this.account, this.platform, item, "no video asset to post");

    try {
      const registerRes = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: ["urn:li:digitalmediaRecipe:feedshare-video"],
            owner: authorUrn,
            serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }],
          },
        }),
      });
      const register = (await registerRes.json()) as any;
      if (!registerRes.ok) throw new Error(`LinkedIn registerUpload failed: ${JSON.stringify(register)}`);
      const uploadUrl = register.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
      const asset = register.value.asset as string;

      const videoBytes = Buffer.from(await (await fetch(item.videoAssetUrl)).arrayBuffer());
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { authorization: `Bearer ${accessToken}` },
        body: videoBytes,
      });
      if (!uploadRes.ok) throw new Error(`LinkedIn video upload failed: ${uploadRes.status}`);

      const text = [item.brief.hook, item.brief.caption, item.brief.hashtags.join(" ")]
        .filter(Boolean)
        .join("\n\n");

      const shareRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
          author: authorUrn,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text },
              shareMediaCategory: "VIDEO",
              media: [{ status: "READY", media: asset }],
            },
          },
          visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
        }),
      });
      const share = (await shareRes.json()) as any;
      if (!shareRes.ok) throw new Error(`LinkedIn ugcPosts failed: ${JSON.stringify(share)}`);

      log.info({ account: this.account.id, postId: share.id }, "linkedin video published");
      return ok(this.account, this.platform, item, share.id);
    } catch (err) {
      return fail(this.account, this.platform, item, err);
    }
  }
}

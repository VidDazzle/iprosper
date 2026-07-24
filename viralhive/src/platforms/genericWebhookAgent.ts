import type { AccountConfig, ContentItem, PostResult } from "../config/types.js";
import type { SocialPlatformAgent } from "./types.js";
import { ok, fail } from "./types.js";
import { childLogger } from "../core/logger.js";

const log = childLogger("webhook-agent");

/**
 * Escape hatch for any platform without a dedicated agent yet (Threads,
 * Snapchat, Reddit, a Zapier/Make/Buffer bridge, an internal CMS, etc).
 * POSTs the fully-rendered content item as JSON to account.webhookUrl and
 * lets a downstream automation (Zapier, Make, n8n, your own endpoint)
 * finish the platform-specific publish step.
 */
export class GenericWebhookAgent implements SocialPlatformAgent {
  readonly platform = "webhook" as const;
  constructor(public account: AccountConfig) {}

  async post(item: ContentItem): Promise<PostResult> {
    if (!this.account.webhookUrl) {
      return fail(this.account, this.platform, item, "account has no webhookUrl configured");
    }
    if (!item.videoAssetUrl) return fail(this.account, this.platform, item, "no video asset to post");

    try {
      const res = await fetch(this.account.webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          accountId: this.account.id,
          videoUrl: item.videoAssetUrl,
          caption: item.brief.caption,
          hashtags: item.brief.hashtags,
          hook: item.brief.hook,
        }),
      });
      if (!res.ok) throw new Error(`webhook post failed: ${res.status} ${await res.text()}`);

      log.info({ account: this.account.id }, "dispatched to generic webhook");
      return ok(this.account, this.platform, item, "webhook-dispatched");
    } catch (err) {
      return fail(this.account, this.platform, item, err);
    }
  }
}

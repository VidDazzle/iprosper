import type { AccountConfig } from "../config/types.js";
import type { SocialPlatformAgent } from "./types.js";
import { TikTokAgent } from "./tiktokAgent.js";
import { InstagramAgent } from "./instagramAgent.js";
import { FacebookAgent } from "./facebookAgent.js";
import { YouTubeAgent } from "./youtubeAgent.js";
import { XAgent } from "./xAgent.js";
import { LinkedInAgent } from "./linkedinAgent.js";
import { PinterestAgent } from "./pinterestAgent.js";
import { GenericWebhookAgent } from "./genericWebhookAgent.js";

/** Instantiates exactly one platform agent per configured, enabled account. */
export function buildAgentsForAccounts(accounts: AccountConfig[]): SocialPlatformAgent[] {
  return accounts.filter((a) => a.enabled).map(buildAgent);
}

function buildAgent(account: AccountConfig): SocialPlatformAgent {
  switch (account.platform) {
    case "tiktok":
      return new TikTokAgent(account);
    case "instagram":
      return new InstagramAgent(account);
    case "facebook":
      return new FacebookAgent(account);
    case "youtube":
      return new YouTubeAgent(account);
    case "x":
      return new XAgent(account);
    case "linkedin":
      return new LinkedInAgent(account);
    case "pinterest":
      return new PinterestAgent(account);
    case "webhook":
      return new GenericWebhookAgent(account);
    default: {
      const exhaustive: never = account.platform;
      throw new Error(`No agent implementation for platform "${exhaustive}"`);
    }
  }
}

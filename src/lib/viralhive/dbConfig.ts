import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  viralhiveAccounts,
  viralhiveCampaigns,
  viralhiveProducts,
  viralhiveProviders,
  viralhiveSettings,
} from "@/db/schema";
import { decryptJson, decryptSecret } from "./crypto";
import type { AppConfig, AccountConfig, CampaignConfig, Product, ProviderConfig } from "viralhive/config/types";

/**
 * Builds the exact AppConfig shape the viralhive engine expects, sourced
 * from the DB instead of accounts.yaml. Secrets are decrypted here and
 * written into synthetic process.env vars (VH_ACCOUNT_*, VH_PROVIDER_*,
 * VH_STRIPE_SECRET_KEY) so the unmodified engine code — which resolves
 * credentials via `credentials: { key: ENV_VAR_NAME }` — works exactly as
 * it does in the standalone CLI, without needing to fork that logic.
 */
export async function buildAppConfigFromDb(): Promise<AppConfig> {
  const [accountRows, campaignRows, productRows, providerRows, settingRows] = await Promise.all([
    db.select().from(viralhiveAccounts),
    db.select().from(viralhiveCampaigns),
    db.select().from(viralhiveProducts),
    db.select().from(viralhiveProviders),
    db.select().from(viralhiveSettings),
  ]);

  const settings = Object.fromEntries(settingRows.map((s) => [s.key, s.value]));

  const providerRegistry: ProviderConfig[] = providerRows.map((p) => {
    const envVar = `VH_PROVIDER_${p.id}_KEY`;
    process.env[envVar] = decryptSecret(p.apiKeyEncrypted);
    return {
      id: p.id,
      kind: p.kind as ProviderConfig["kind"],
      baseUrl: p.baseUrl ?? undefined,
      model: p.model ?? undefined,
      apiKeyEnv: envVar,
    };
  });

  const accounts: AccountConfig[] = accountRows.map((a) => {
    const decrypted = decryptJson(a.credentialsEncrypted);
    const credentials: Record<string, string> = {};
    for (const [key, value] of Object.entries(decrypted)) {
      const envVar = `VH_ACCOUNT_${a.id}_${key}`;
      process.env[envVar] = value;
      credentials[key] = envVar;
    }
    return {
      id: a.id,
      platform: a.platform as AccountConfig["platform"],
      displayName: a.displayName,
      credentials,
      niche: a.niche,
      postsPerDay: a.postsPerDay,
      postingWindow: JSON.parse(a.postingWindow),
      timezone: a.timezone,
      enabled: a.enabled,
      webhookUrl: a.webhookUrl ?? undefined,
    };
  });

  const products: Product[] = productRows.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    priceCents: p.priceCents,
    currency: p.currency,
    imageUrls: JSON.parse(p.imageUrls),
    stripePriceId: p.stripePriceId ?? undefined,
  }));

  const campaigns: CampaignConfig[] = campaignRows.map((c) => ({
    id: c.id,
    name: c.name,
    niche: c.niche,
    goal: c.goal,
    toneKeywords: JSON.parse(c.toneKeywords),
    bannedTopics: JSON.parse(c.bannedTopics),
    platforms: [], // informational-only in the standalone config; unused downstream
    accountIds: JSON.parse(c.accountIds),
    qualityThreshold: c.qualityThreshold,
    maxRegenerationAttempts: c.maxRegenerationAttempts,
    videoLengthSeconds: c.videoLengthSeconds,
    autopilot: c.autopilot,
    smartScheduling: c.smartScheduling,
    engagementAutoReply: c.engagementAutoReply,
    productId: c.productId ?? undefined,
  }));

  let stripeSecretKeyEnv: string | undefined;
  if (settings.stripeSecretKeyEncrypted) {
    stripeSecretKeyEnv = "VH_STRIPE_SECRET_KEY";
    process.env[stripeSecretKeyEnv] = decryptSecret(settings.stripeSecretKeyEncrypted);
  }

  return {
    accounts,
    campaigns,
    products,
    commerce: {
      stripeSecretKeyEnv,
      checkoutBaseUrl: settings.checkoutBaseUrl,
    },
    // Kept for type compatibility with the CLI's AppConfig shape; the web
    // integration resolves providers per-campaign instead (see runCampaign.ts).
    providers: { script: [], video: [] },
    providerRegistry,
    dbPath: "",
    logLevel: "info",
  };
}

/**
 * Per-campaign provider id chains. The engine's AppConfig.providers is a
 * single global selection; the dashboard lets each campaign pick its own, so
 * callers merge this in as `{ ...config, providers: selection }` right
 * before invoking buildCampaignProviders for a specific campaign.
 */
export async function getCampaignProviderSelection(campaignId: string) {
  const [row] = await db.select().from(viralhiveCampaigns).where(eq(viralhiveCampaigns.id, campaignId));
  if (!row) throw new Error(`Unknown campaign "${campaignId}"`);
  return {
    script: JSON.parse(row.scriptProviderIds) as string[],
    video: JSON.parse(row.videoProviderIds) as string[],
    image: row.imageProviderId ?? undefined,
    voice: row.voiceProviderId ?? undefined,
    virality: row.viralityProviderId ?? undefined,
  };
}

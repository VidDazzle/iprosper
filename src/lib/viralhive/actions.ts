"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  viralhiveAccounts,
  viralhiveCampaigns,
  viralhiveProducts,
  viralhiveProviders,
  viralhiveSettings,
} from "@/db/schema";
import { checkAdminPassword, createSessionToken, SESSION_COOKIE } from "./auth";
import { encryptJson, encryptSecret } from "./crypto";
import { setAutopilot as setAutopilotState } from "./dbState";
import { runCampaignOnceWeb, type CampaignRunSummary } from "./runCampaign";

function now() {
  return new Date().toISOString();
}

// --- Auth ---

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!checkAdminPassword(password)) {
    redirect("/viralhive/login?error=1");
  }
  const jar = await cookies();
  jar.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect((formData.get("next") as string) || "/viralhive");
}

export async function logoutAction() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/viralhive/login");
}

// --- Accounts ---

export async function upsertAccountAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Account id is required");

  const credentials: Record<string, string> = {};
  const rawCreds = String(formData.get("credentials") ?? "");
  for (const line of rawCreds.split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key?.trim() && rest.length) credentials[key.trim()] = rest.join("=").trim();
  }

  const row: Record<string, unknown> = {
    id,
    platform: String(formData.get("platform")),
    displayName: String(formData.get("displayName")),
    niche: String(formData.get("niche") || "general"),
    postsPerDay: Number(formData.get("postsPerDay") || 1),
    postingWindow: JSON.stringify(
      String(formData.get("postingWindow") || "09:00")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    ),
    timezone: String(formData.get("timezone") || "UTC"),
    webhookUrl: (formData.get("webhookUrl") as string) || null,
    enabled: formData.get("enabled") === "on",
    updatedAt: now(),
  };
  // Leaving the credentials textarea blank on an edit keeps the existing
  // encrypted values instead of wiping them — only overwrite when provided.
  if (Object.keys(credentials).length > 0) {
    row.credentialsEncrypted = encryptJson(credentials);
  }

  await db
    .insert(viralhiveAccounts)
    .values({ ...row, credentialsEncrypted: row.credentialsEncrypted ?? encryptJson({}), createdAt: now() } as typeof viralhiveAccounts.$inferInsert)
    .onConflictDoUpdate({ target: viralhiveAccounts.id, set: row });

  revalidatePath("/viralhive/accounts");
}

export async function deleteAccountAction(id: string) {
  await db.delete(viralhiveAccounts).where(eq(viralhiveAccounts.id, id));
  revalidatePath("/viralhive/accounts");
}

export async function toggleAccountEnabledAction(id: string, enabled: boolean) {
  await db.update(viralhiveAccounts).set({ enabled, updatedAt: now() }).where(eq(viralhiveAccounts.id, id));
  revalidatePath("/viralhive/accounts");
}

// --- Providers ---

export async function upsertProviderAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Provider id is required");

  const apiKey = String(formData.get("apiKey") ?? "");
  const row: Partial<typeof viralhiveProviders.$inferInsert> = {
    id,
    kind: String(formData.get("kind")),
    baseUrl: (formData.get("baseUrl") as string) || null,
    model: (formData.get("model") as string) || null,
    updatedAt: now(),
  };
  if (apiKey) row.apiKeyEncrypted = encryptSecret(apiKey);

  const existing = await db.select().from(viralhiveProviders).where(eq(viralhiveProviders.id, id));
  if (existing.length) {
    await db.update(viralhiveProviders).set(row).where(eq(viralhiveProviders.id, id));
  } else {
    if (!apiKey) throw new Error("API key is required when creating a new provider");
    await db.insert(viralhiveProviders).values({ ...row, apiKeyEncrypted: encryptSecret(apiKey), createdAt: now() } as typeof viralhiveProviders.$inferInsert);
  }

  revalidatePath("/viralhive/providers");
}

export async function deleteProviderAction(id: string) {
  await db.delete(viralhiveProviders).where(eq(viralhiveProviders.id, id));
  revalidatePath("/viralhive/providers");
}

// --- Products ---

export async function upsertProductAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Product id is required");

  const row = {
    id,
    name: String(formData.get("name")),
    description: String(formData.get("description")),
    priceCents: Math.round(Number(formData.get("price") || 0) * 100),
    currency: String(formData.get("currency") || "usd"),
    imageUrls: JSON.stringify(
      String(formData.get("imageUrls") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    ),
    stripePriceId: (formData.get("stripePriceId") as string) || null,
    updatedAt: now(),
  };

  await db
    .insert(viralhiveProducts)
    .values({ ...row, createdAt: now() })
    .onConflictDoUpdate({ target: viralhiveProducts.id, set: row });

  revalidatePath("/viralhive/products");
}

export async function deleteProductAction(id: string) {
  await db.delete(viralhiveProducts).where(eq(viralhiveProducts.id, id));
  revalidatePath("/viralhive/products");
}

// --- Campaigns ---

export async function upsertCampaignAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Campaign id is required");

  const accountIds = formData.getAll("accountIds").map(String);
  const scriptProviderIds = formData.getAll("scriptProviderIds").map(String);
  const videoProviderIds = formData.getAll("videoProviderIds").map(String);

  const row = {
    id,
    name: String(formData.get("name")),
    niche: String(formData.get("niche")),
    goal: String(formData.get("goal")),
    toneKeywords: JSON.stringify(splitCsv(formData.get("toneKeywords"))),
    bannedTopics: JSON.stringify(splitCsv(formData.get("bannedTopics"))),
    accountIds: JSON.stringify(accountIds),
    scriptProviderIds: JSON.stringify(scriptProviderIds),
    videoProviderIds: JSON.stringify(videoProviderIds),
    imageProviderId: (formData.get("imageProviderId") as string) || null,
    voiceProviderId: (formData.get("voiceProviderId") as string) || null,
    viralityProviderId: (formData.get("viralityProviderId") as string) || null,
    qualityThreshold: Number(formData.get("qualityThreshold") || 9.2),
    maxRegenerationAttempts: Number(formData.get("maxRegenerationAttempts") || 4),
    videoLengthSeconds: Number(formData.get("videoLengthSeconds") || 30),
    autopilot: formData.get("autopilot") === "on",
    smartScheduling: formData.get("smartScheduling") === "on",
    engagementAutoReply: formData.get("engagementAutoReply") === "on",
    productId: (formData.get("productId") as string) || null,
    updatedAt: now(),
  };

  await db
    .insert(viralhiveCampaigns)
    .values({ ...row, createdAt: now() })
    .onConflictDoUpdate({ target: viralhiveCampaigns.id, set: row });

  revalidatePath("/viralhive/campaigns");
}

export async function deleteCampaignAction(id: string) {
  await db.delete(viralhiveCampaigns).where(eq(viralhiveCampaigns.id, id));
  revalidatePath("/viralhive/campaigns");
}

export async function toggleCampaignAutopilotAction(id: string, enabled: boolean) {
  await setAutopilotState(id, enabled);
  revalidatePath("/viralhive/campaigns");
  revalidatePath("/viralhive");
}

export async function runCampaignNowAction(campaignId: string): Promise<CampaignRunSummary> {
  const summary = await runCampaignOnceWeb(campaignId);
  revalidatePath("/viralhive");
  revalidatePath("/viralhive/campaigns");
  return summary;
}

// --- Settings ---

export async function updateSettingsAction(formData: FormData) {
  const checkoutBaseUrl = String(formData.get("checkoutBaseUrl") ?? "");
  const stripeSecretKey = String(formData.get("stripeSecretKey") ?? "");

  await upsertSetting("checkoutBaseUrl", checkoutBaseUrl);
  if (stripeSecretKey) {
    await upsertSetting("stripeSecretKeyEncrypted", encryptSecret(stripeSecretKey));
  }
  revalidatePath("/viralhive/settings");
}

async function upsertSetting(key: string, value: string) {
  await db
    .insert(viralhiveSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: viralhiveSettings.key, set: { value } });
}

function splitCsv(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

import fs from "node:fs";
import path from "node:path";
import * as yaml from "js-yaml";
import { z } from "zod";
import "dotenv/config";
import type { AppConfig } from "./types.js";

const accountSchema = z.object({
  id: z.string(),
  platform: z.enum([
    "tiktok",
    "instagram",
    "facebook",
    "youtube",
    "x",
    "linkedin",
    "pinterest",
    "webhook",
  ]),
  displayName: z.string(),
  credentials: z.record(z.string(), z.string()).default({}),
  niche: z.string().default("general"),
  postsPerDay: z.number().int().min(0).max(24).default(1),
  postingWindow: z.array(z.string()).default(["09:00"]),
  timezone: z.string().default("UTC"),
  enabled: z.boolean().default(true),
  webhookUrl: z.string().optional(),
});

const campaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  niche: z.string(),
  goal: z.string(),
  toneKeywords: z.array(z.string()).default([]),
  bannedTopics: z.array(z.string()).default([]),
  platforms: z.array(accountSchema.shape.platform),
  accountIds: z.array(z.string()),
  qualityThreshold: z.number().min(0).max(10).default(9.2),
  maxRegenerationAttempts: z.number().int().min(1).max(10).default(4),
  videoLengthSeconds: z.number().int().min(5).max(180).default(30),
  autopilot: z.boolean().default(true),
  smartScheduling: z.boolean().default(true),
  engagementAutoReply: z.boolean().default(true),
  productId: z.string().optional(),
});

const providerSchema = z.object({
  id: z.string(),
  kind: z.enum(["llm-openai-compatible", "llm-anthropic", "higgsfield", "leonardo", "elevenlabs"]),
  baseUrl: z.string().optional(),
  apiKeyEnv: z.string(),
  model: z.string().optional(),
});

const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  priceCents: z.number().int().min(0),
  currency: z.string().default("usd"),
  imageUrls: z.array(z.string()).default([]),
  stripePriceId: z.string().optional(),
});

const commerceSchema = z.object({
  stripeSecretKeyEnv: z.string().optional(),
  checkoutBaseUrl: z.string().optional(),
});

const providerRef = z.union([z.string(), z.array(z.string()).min(1)]);

const rootSchema = z.object({
  accounts: z.array(accountSchema).default([]),
  campaigns: z.array(campaignSchema).default([]),
  products: z.array(productSchema).default([]),
  commerce: commerceSchema.default({}),
  providers: z.object({
    script: providerRef,
    video: providerRef,
    image: providerRef.optional(),
    voice: providerRef.optional(),
    virality: providerRef.optional(),
  }),
  providerRegistry: z.array(providerSchema).default([]),
  dbPath: z.string().default("./data/viralhive.db"),
  logLevel: z.string().default("info"),
});

export function loadConfig(configPath = process.env.CONFIG_PATH || "./accounts.yaml"): AppConfig {
  const resolved = path.resolve(configPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(
      `Config file not found at ${resolved}. Copy accounts.example.yaml to accounts.yaml and fill it in.`
    );
  }
  const raw = fs.readFileSync(resolved, "utf8");
  const parsed = yaml.load(raw);
  const config = rootSchema.parse(parsed);

  for (const account of config.accounts) {
    for (const envVar of Object.values(account.credentials)) {
      if (!process.env[envVar]) {
        throw new Error(
          `Account "${account.id}" references env var "${envVar}" which is not set. ` +
            `Add it to your .env file before starting the agent.`
        );
      }
    }
  }

  for (const campaign of config.campaigns) {
    for (const accountId of campaign.accountIds) {
      if (!config.accounts.some((a) => a.id === accountId)) {
        throw new Error(`Campaign "${campaign.id}" references unknown account "${accountId}"`);
      }
    }
    if (campaign.productId && !config.products.some((p) => p.id === campaign.productId)) {
      throw new Error(`Campaign "${campaign.id}" references unknown product "${campaign.productId}"`);
    }
  }

  if (config.commerce.stripeSecretKeyEnv && !process.env[config.commerce.stripeSecretKeyEnv]) {
    throw new Error(
      `commerce.stripeSecretKeyEnv references "${config.commerce.stripeSecretKeyEnv}" which is not set in .env`
    );
  }

  return config as AppConfig;
}

/** Normalizes a providers.* entry (single id or fallback chain) into an ordered array. */
export function providerChain(ref: string | string[]): string[] {
  return Array.isArray(ref) ? ref : [ref];
}

/** Resolves an account's declared credential env-var names into actual secret values. */
export function resolveCredentials(credentials: Record<string, string>): Record<string, string> {
  const resolved: Record<string, string> = {};
  for (const [key, envVar] of Object.entries(credentials)) {
    resolved[key] = process.env[envVar] ?? "";
  }
  return resolved;
}

export function resolveProviderApiKey(apiKeyEnv: string): string {
  const key = process.env[apiKeyEnv];
  if (!key) {
    throw new Error(`Provider API key env var "${apiKeyEnv}" is not set.`);
  }
  return key;
}

import JSZip from "jszip";
import { prisma } from "@apex/db";
import { loadEnv, isMockSiteDeployLive } from "@apex/config";

export interface MockSiteDeployResult {
  siteUrl: string | null;
  deployId: string | null;
  live: boolean;
}

/**
 * Deploys one job's generated mock-site HTML as a new, non-production
 * deploy under a single pre-created Netlify site (NETLIFY_SITE_ID) —
 * each deploy gets its own unique preview subdomain from Netlify
 * (deploy_ssl_url), so no per-prospect site needs to be created and
 * the account doesn't accumulate one site per prospect.
 *
 * Gated on isMockSiteDeployLive() (LIVE_MODE + NETLIFY_DEPLOY_ENABLED)
 * AND real credentials — in dry-run/unconfigured, returns
 * {siteUrl: null, live: false} and deploys nothing publicly. NOT
 * verified against a live Netlify API in this build — the request
 * shape below is best-effort from Netlify's documented ZIP-deploy
 * flow and needs a real smoke test before this stage is trusted live.
 */
export async function deployMockSite(jobId: string, html: string): Promise<MockSiteDeployResult> {
  const env = loadEnv();

  if (!isMockSiteDeployLive() || !env.NETLIFY_API_KEY || !env.NETLIFY_SITE_ID) {
    await prisma.mockSite.upsert({
      where: { jobId },
      update: { siteUrl: null, deployId: null, deployedLive: false },
      create: { jobId, siteUrl: null, deployId: null, deployedLive: false },
    });
    return { siteUrl: null, deployId: null, live: false };
  }

  const zip = new JSZip();
  zip.file("index.html", html);
  const zipBytes = await zip.generateAsync({ type: "uint8array" });

  const res = await fetch(`https://api.netlify.com/api/v1/sites/${env.NETLIFY_SITE_ID}/deploys`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.NETLIFY_API_KEY}`,
      "Content-Type": "application/zip",
    },
    // Uint8Array is a valid fetch body at runtime (undici); the `any`
    // cast works around this file being type-checked under different
    // lib configs depending on which package imports it (this package
    // has no "DOM" lib, consumers like @apex/pipeline do) — BodyInit
    // itself isn't a stable name to reference across both.
    body: zipBytes as any,
  });

  if (!res.ok) {
    throw new Error(`Netlify deploy failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { id: string; deploy_ssl_url?: string; deploy_url?: string };
  const siteUrl = data.deploy_ssl_url ?? data.deploy_url ?? null;

  await prisma.mockSite.upsert({
    where: { jobId },
    update: { siteUrl, deployId: data.id, deployedLive: true },
    create: { jobId, siteUrl, deployId: data.id, deployedLive: true },
  });

  return { siteUrl, deployId: data.id, live: true };
}

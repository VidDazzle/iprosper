import { prisma } from "@apex/db";
import { buildPreviewUrl } from "@apex/config";
import { runComplianceGate } from "@apex/audit";
// Imported from the specific module (not the package barrel) so this
// Node-only package doesn't pull @apex/renderer's React/.tsx template
// components into its module graph — this stage only needs the pure
// template-selection function.
import { selectTemplate } from "@apex/renderer/src/selectTemplate.js";
import type { BrandKit, JobRequest } from "@apex/contracts";

const PREVIEW_TTL_MS = 24 * 60 * 60 * 1000; // 24h, spec Section 4

export interface RenderResult {
  previewUrl: string;
  expiresAt: Date;
  templateKey: ReturnType<typeof selectTemplate>;
}

/**
 * Persists BrandKit, runs the compliance gate against the rendered
 * copy (PII scan — a scraped page can easily contain someone's personal
 * email/phone that shouldn't get echoed into a public preview), and
 * writes the signed/expiring PreviewResult row. Actual pixel rendering
 * happens client-side in apps/web via @apex/renderer's template
 * components — this stage prepares the data + URL they render from.
 */
export async function render(jobId: string, brandKit: BrandKit, jobRequest: JobRequest): Promise<RenderResult> {
  const templateKey = selectTemplate(brandKit, jobRequest.vertical);

  const renderedText = [
    brandKit.name,
    ...brandKit.services,
    ...brandKit.reviews.map((r) => String(r.text ?? "")),
  ].join(" ");

  await runComplianceGate({
    contentType: "rebrand-preview",
    content: renderedText,
    jobId,
    // The business's own scraped contact info is expected to appear in
    // its own preview — that's not a leak, it's already public on their
    // site. Only third-party/unexpected PII should block.
    piiAllowlist: brandKit.logoUrl ? [brandKit.logoUrl] : [],
  });

  await prisma.brandKit.upsert({
    where: { jobId },
    update: {
      name: brandKit.name,
      palette: brandKit.palette,
      fonts: brandKit.fonts,
      logoUrl: brandKit.logoUrl,
      services: brandKit.services,
      reviews: brandKit.reviews as never,
    },
    create: {
      jobId,
      name: brandKit.name,
      palette: brandKit.palette,
      fonts: brandKit.fonts,
      logoUrl: brandKit.logoUrl,
      services: brandKit.services,
      reviews: brandKit.reviews as never,
    },
  });

  const expiresAt = new Date(Date.now() + PREVIEW_TTL_MS);
  const previewUrl = buildPreviewUrl(jobId, expiresAt);

  await prisma.previewResult.upsert({
    where: { jobId },
    update: { previewUrl, expiresAt, watermarked: true },
    create: { jobId, previewUrl, expiresAt, watermarked: true },
  });

  return { previewUrl, expiresAt, templateKey };
}

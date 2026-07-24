import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@apex/db";
import { verifyPreviewSignature } from "@apex/config";
import { jobRequestSchema, type BrandKit } from "@apex/contracts";
import { selectTemplate } from "@apex/renderer/src/selectTemplate.js";

export async function GET(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const exp = req.nextUrl.searchParams.get("exp");
  const sig = req.nextUrl.searchParams.get("sig");

  if (!exp || !sig || !verifyPreviewSignature(jobId, Number(exp), sig)) {
    return NextResponse.json({ error: "This preview link is invalid or has expired." }, { status: 410 });
  }

  const job = await prisma.dispatchJob.findUnique({
    where: { id: jobId },
    include: { brandKit: true, previewResult: true, lead: true },
  });

  if (!job || !job.brandKit || !job.previewResult) {
    return NextResponse.json({ error: "Preview not found." }, { status: 404 });
  }

  const brandKit: BrandKit = {
    name: job.brandKit.name,
    palette: job.brandKit.palette,
    fonts: job.brandKit.fonts,
    logoUrl: job.brandKit.logoUrl ?? undefined,
    services: job.brandKit.services,
    reviews: job.brandKit.reviews as Record<string, unknown>[],
  };

  const jobRequest = jobRequestSchema.parse(job.task);
  const templateKey = selectTemplate(brandKit, jobRequest.vertical);

  return NextResponse.json({
    brandKit,
    templateKey,
    voiceAgentId: job.previewResult.voiceAgentId,
    unlocked: Boolean(job.lead),
  });
}

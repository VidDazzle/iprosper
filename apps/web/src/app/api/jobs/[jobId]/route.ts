import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@apex/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;

  const job = await prisma.dispatchJob.findUnique({
    where: { id: jobId },
    include: { previewResult: true },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  return NextResponse.json({
    status: job.status,
    stage: job.stage,
    previewUrl: job.previewResult?.previewUrl ?? null,
    expiresAt: job.previewResult?.expiresAt ?? null,
    inspectorVerdict: job.inspectorVerdict,
  });
}

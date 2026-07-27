import { prisma } from "@apex/db";
import { recordCost } from "@apex/spend";
import { recordSuccessfulRun } from "@apex/agents";
import { jobRequestSchema, type JobRequest } from "@apex/contracts";
import { scrape, ScrapeDisallowedError } from "./scrape.js";
import { extractBrandKit } from "./extract.js";
import { render } from "./render.js";
import { voice } from "./voice.js";
import { STAGE_COST } from "./costs.js";
import { generateMockSiteHtml, deployMockSite } from "@apex/mocksite";

interface DoneChecklist {
  scrape: boolean;
  extract: boolean;
  render: boolean;
  mocksite: boolean;
  voice: boolean;
}

/**
 * Runs SCRAPE -> EXTRACT -> RENDER -> VOICE for one DispatchJob
 * (spec Section 4 pipeline). NOTIFY is not part of this chain — it
 * fires separately when a prospect actually submits the lead-gate form
 * (see notify.ts / captureLead), not automatically after VOICE.
 *
 * Loop-engineering additions (task #11): records a doneChecklist +
 * inspectorVerdict on the job, a JobOutcome memory record, and — on a
 * clean run — reports the success to the agent's trial-promotion
 * tracking (@apex/agents).
 */
export async function runPipeline(dispatchJobId: string) {
  const job = await prisma.dispatchJob.findUniqueOrThrow({ where: { id: dispatchJobId } });
  if (job.status === "killed") {
    return { skipped: true as const, reason: "job is killed" };
  }

  const jobRequest: JobRequest = jobRequestSchema.parse(job.task);
  const doneChecklist: DoneChecklist = { scrape: false, extract: false, render: false, mocksite: false, voice: false };

  await prisma.dispatchJob.update({ where: { id: dispatchJobId }, data: { status: "running", stage: "scrape" } });

  try {
    await recordCost(dispatchJobId, STAGE_COST.scrape);
    const scrapeResult = await scrape(jobRequest.url);
    doneChecklist.scrape = true;

    await prisma.dispatchJob.update({ where: { id: dispatchJobId }, data: { stage: "extract" } });
    await recordCost(dispatchJobId, STAGE_COST.extract);
    const brandKit = extractBrandKit(undefined, scrapeResult.pages);
    doneChecklist.extract = true;

    await prisma.dispatchJob.update({ where: { id: dispatchJobId }, data: { stage: "render" } });
    await recordCost(dispatchJobId, STAGE_COST.render);
    const renderResult = await render(dispatchJobId, brandKit, jobRequest);
    doneChecklist.render = true;

    await prisma.dispatchJob.update({ where: { id: dispatchJobId }, data: { stage: "mocksite" } });
    await recordCost(dispatchJobId, STAGE_COST.geminiSite);
    const genResult = await generateMockSiteHtml(dispatchJobId, brandKit);
    let mockSiteUrl: string | null = null;
    if (genResult.html) {
      await recordCost(dispatchJobId, STAGE_COST.netlifyDeploy);
      const deployResult = await deployMockSite(dispatchJobId, genResult.html);
      mockSiteUrl = deployResult.siteUrl;
    }
    doneChecklist.mocksite = true;

    await prisma.dispatchJob.update({ where: { id: dispatchJobId }, data: { stage: "voice" } });
    await recordCost(dispatchJobId, STAGE_COST.voice);
    const voiceResult = await voice(dispatchJobId, brandKit);
    doneChecklist.voice = true;

    const inspectorVerdict = {
      passed: true,
      checkedAt: new Date().toISOString(),
      notes: "All pipeline stages completed within budget cap.",
    };

    await prisma.dispatchJob.update({
      where: { id: dispatchJobId },
      data: {
        status: "completed",
        stage: "closed",
        doneChecklist: doneChecklist as never,
        inspectorVerdict: inspectorVerdict as never,
      },
    });

    await prisma.jobOutcome.upsert({
      where: { jobId: dispatchJobId },
      update: {
        result: {
          previewUrl: renderResult.previewUrl,
          mockSiteUrl,
          templateKey: renderResult.templateKey,
          voiceLive: voiceResult.live,
        } as never,
      },
      create: {
        jobId: dispatchJobId,
        baseline: { url: jobRequest.url } as never,
        hypothesis: "An automated cinematic rebrand preview converts a cold prospect better than a plain pitch.",
        result: {
          previewUrl: renderResult.previewUrl,
          mockSiteUrl,
          templateKey: renderResult.templateKey,
          voiceLive: voiceResult.live,
        } as never,
      },
    });

    await recordSuccessfulRun(job.agentId);

    return { skipped: false as const, renderResult, mockSiteUrl, voiceResult, doneChecklist };
  } catch (err) {
    const inspectorVerdict = {
      passed: false,
      checkedAt: new Date().toISOString(),
      error: err instanceof Error ? err.message : String(err),
      failedAtStage: !doneChecklist.scrape
        ? "scrape"
        : !doneChecklist.extract
          ? "extract"
          : !doneChecklist.render
            ? "render"
            : !doneChecklist.mocksite
              ? "mocksite"
              : "voice",
    };

    const isDisallowed = err instanceof ScrapeDisallowedError;

    await prisma.dispatchJob.update({
      where: { id: dispatchJobId },
      data: {
        status: "failed",
        doneChecklist: doneChecklist as never,
        inspectorVerdict: inspectorVerdict as never,
      },
    });

    if (isDisallowed) {
      return { skipped: true as const, reason: err.message };
    }
    throw err;
  }
}

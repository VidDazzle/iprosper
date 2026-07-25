import { NextResponse, type NextRequest } from "next/server";
import { findDueCampaigns, collectAnalyticsWeb, pollEngagementWeb } from "@/lib/viralhive/cronJobs";
import { runCampaignOnceWeb } from "@/lib/viralhive/runCampaign";

export const maxDuration = 300; // this does real generation + posting work; give it room

/**
 * Hit by Vercel Cron (see vercel.json) — this single endpoint is what makes
 * ViralHive actually autonomous: it runs whether or not the dashboard is
 * open, on any device, because nothing here depends on a browser or a
 * persistent process. Every invocation: posts any due, autopilot-enabled
 * campaigns; collects fresh engagement metrics; answers prospect comments.
 */
export async function GET(req: NextRequest) {
  // Vercel Cron automatically sends `Authorization: Bearer $CRON_SECRET` when
  // that env var is set on the project — https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
  const expected = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dueCampaigns = await findDueCampaigns();
  const postResults = [];
  for (const campaignId of dueCampaigns) {
    try {
      postResults.push(await runCampaignOnceWeb(campaignId));
    } catch (err) {
      postResults.push({ campaignId, error: err instanceof Error ? err.message : String(err) });
    }
  }

  const [analytics, engagement] = await Promise.all([
    collectAnalyticsWeb().catch((err) => ({ error: err instanceof Error ? err.message : String(err) })),
    pollEngagementWeb().catch((err) => ({ error: err instanceof Error ? err.message : String(err) })),
  ]);

  return NextResponse.json({ ranAt: new Date().toISOString(), dueCampaigns, postResults, analytics, engagement });
}

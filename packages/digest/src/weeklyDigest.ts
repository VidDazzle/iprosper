import { prisma } from "@apex/db";
import { loadEnv } from "@apex/config";
import { ENGINES } from "@apex/contracts";

function startOfWeek(d: Date): Date {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  date.setUTCDate(date.getUTCDate() - diff);
  return date;
}

export interface WeeklyDigestContent {
  weekStart: string;
  weekEnd: string;
  previewsGenerated: number;
  leadsCaptured: number;
  consentRate: number;
  touchesByChannel: Record<string, number>;
  closes: number;
  costPerClose: number | null;
  totalSpend: number;
  totalRevenue: number;
  roiPerEngine: { engine: string; spend: number; revenue: number; roi: number }[];
  engineStatus: { engine: string; status: string }[];
  killSwitchEvents: { agentId: string | null; reason: unknown; firedAt: string }[];
}

/**
 * Auditor weekly report (spec Section 8): "Previews generated, leads
 * captured, consent-rate, touches sent per channel, closes,
 * cost-per-close, ROI per engine, current status per engine,
 * kill-switch events — delivered via owner digest before Sunday's
 * rebalance runs." Reading order for the report matches the ops
 * runbook (spec Section 9): ROI -> status -> kill-switch events ->
 * cost-per-close -> consent-rate, so this object is laid out in that
 * order even though JS object key order isn't semantically load-bearing.
 */
export async function computeWeeklyDigestContent(now: Date = new Date()): Promise<WeeklyDigestContent> {
  const weekEnd = startOfWeek(now);
  const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
  const window = { gte: weekStart, lt: weekEnd };

  const [previewsGenerated, leadsCaptured, touches, closedJobs, spendJobs, engineWeeks, killEvents] =
    await Promise.all([
      prisma.previewResult.count({ where: { createdAt: window } }),
      prisma.lead.count({ where: { createdAt: window } }),
      prisma.touch.groupBy({ by: ["channel"], where: { sentAt: window }, _count: { _all: true } }),
      prisma.dispatchJob.findMany({
        where: { invoicePaid: true, invoicePaidAt: window },
        select: { engine: true, revenueAttributed: true },
      }),
      prisma.dispatchJob.findMany({
        where: { createdAt: window },
        select: { engine: true, costToDate: true, revenueAttributed: true },
      }),
      prisma.engineWeek.findMany({ orderBy: { weekStart: "desc" }, distinct: ["engine"] }),
      prisma.auditLog.findMany({
        where: { action: "kill_switch_fired", createdAt: window },
        select: { target: true, detail: true, createdAt: true },
      }),
    ]);

  const touchesByChannel: Record<string, number> = {};
  for (const t of touches) touchesByChannel[t.channel] = t._count._all;

  const closes = closedJobs.length;
  const totalSpend = spendJobs.reduce((s, j) => s + Number(j.costToDate), 0);
  const totalRevenue = spendJobs.reduce((s, j) => s + Number(j.revenueAttributed), 0);
  const costPerClose = closes > 0 ? totalSpend / closes : null;

  const roiPerEngine = ENGINES.map((engine) => {
    const jobs = spendJobs.filter((j) => j.engine === engine);
    const spend = jobs.reduce((s, j) => s + Number(j.costToDate), 0);
    const revenue = jobs.reduce((s, j) => s + Number(j.revenueAttributed), 0);
    return { engine, spend, revenue, roi: spend > 0 ? (revenue - spend) / spend : 0 };
  });

  const engineStatus = ENGINES.map((engine) => {
    const row = engineWeeks.find((w) => w.engine === engine);
    return { engine, status: row?.status ?? "balanced" };
  });

  return {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    previewsGenerated,
    leadsCaptured,
    consentRate: previewsGenerated > 0 ? leadsCaptured / previewsGenerated : 0,
    touchesByChannel,
    closes,
    costPerClose,
    totalSpend,
    totalRevenue,
    roiPerEngine,
    engineStatus,
    killSwitchEvents: killEvents.map((e) => ({
      agentId: e.target,
      reason: e.detail,
      firedAt: e.createdAt.toISOString(),
    })),
  };
}

/**
 * Generates + persists the digest, then attempts delivery to a
 * generic webhook if one is configured. No delivery channel wired ->
 * the digest is still generated and stored (visible in the admin
 * dashboard), just not pushed anywhere external — that's a real state,
 * not a failure, so it doesn't throw.
 */
export async function generateAndDeliverWeeklyDigest(now: Date = new Date()) {
  const content = await computeWeeklyDigestContent(now);

  const digest = await prisma.weeklyDigest.upsert({
    where: { weekStart: new Date(content.weekStart) },
    update: { content: content as never },
    create: { weekStart: new Date(content.weekStart), content: content as never },
  });

  const env = loadEnv();
  if (env.OWNER_DIGEST_WEBHOOK_URL) {
    const res = await fetch(env.OWNER_DIGEST_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(content),
    });
    if (res.ok) {
      await prisma.weeklyDigest.update({ where: { id: digest.id }, data: { delivered: true } });
    } else {
      console.error(`[digest] delivery webhook returned ${res.status}`);
    }
  }

  return digest;
}

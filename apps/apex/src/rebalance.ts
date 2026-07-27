import { prisma } from "@apex/db";
import { appendAuditLog } from "@apex/audit";
import { ENGINES, type Engine, type EngineStatus, type RebalanceResult } from "@apex/contracts";

/**
 * These two numbers are NOT specified numerically anywhere in the
 * VidDazzle APEX spec — Section 1 says "clearly outperforms" and
 * "ROI drops below target" without defining either threshold. Rather
 * than silently pick something, these are exposed as env-overridable
 * constants and called out explicitly in the Phase 1 report so a human
 * sets the real values. Defaults chosen for internal consistency with
 * the rest of the spec (0 == breakeven, the same bar the kill-switch
 * uses for "spend exceeds revenue"), not because they're the right
 * business numbers.
 */
export const REBALANCE_WIN_MARGIN = Number(process.env.REBALANCE_WIN_MARGIN ?? 0.05);
export const REBALANCE_TARGET_ROI = Number(process.env.REBALANCE_TARGET_ROI ?? 0);
export const HEARTBEAT_WEIGHT = 0.1;

export interface EnginePriorState {
  engine: Engine;
  status: EngineStatus;
  consecutiveWinCycles: number;
  consecutiveMissCycles: number;
}

export interface EngineWeekActual {
  engine: Engine;
  roi: number;
}

export interface EngineDecision extends EnginePriorState {
  weight: number;
}

/**
 * Pure decision function — no I/O — so the concentration/heartbeat/
 * revert rules can be unit tested directly. `prior` and `actuals` must
 * both cover all three engines.
 */
export function decideRebalance(
  prior: EnginePriorState[],
  actuals: EngineWeekActual[],
): EngineDecision[] {
  const priorByEngine = new Map(prior.map((p) => [p.engine, p]));
  const roiByEngine = new Map(actuals.map((a) => [a.engine, a.roi]));

  const currentlyConcentrated = prior.find((p) => p.status === "concentrated");

  if (currentlyConcentrated) {
    const roi = roiByEngine.get(currentlyConcentrated.engine) ?? 0;
    const priorMiss = currentlyConcentrated.consecutiveMissCycles;

    if (roi < REBALANCE_TARGET_ROI) {
      const missCycles = priorMiss + 1;
      if (missCycles >= 2) {
        return balancedDecision();
      }
      return ENGINES.map((engine) => {
        const isWinner = engine === currentlyConcentrated.engine;
        return {
          engine,
          status: isWinner ? "concentrated" : "heartbeat",
          weight: isWinner ? 1 - 2 * HEARTBEAT_WEIGHT : HEARTBEAT_WEIGHT,
          consecutiveWinCycles: 0,
          consecutiveMissCycles: isWinner ? missCycles : 0,
        };
      });
    }

    // Still winning: reset miss streak, stay concentrated.
    return ENGINES.map((engine) => {
      const isWinner = engine === currentlyConcentrated.engine;
      return {
        engine,
        status: isWinner ? "concentrated" : "heartbeat",
        weight: isWinner ? 1 - 2 * HEARTBEAT_WEIGHT : HEARTBEAT_WEIGHT,
        consecutiveWinCycles: 0,
        consecutiveMissCycles: 0,
      };
    });
  }

  // Not currently concentrated: look for a clear winner this cycle.
  const ranked = [...actuals].sort((a, b) => b.roi - a.roi);
  const [top, second] = ranked;
  const clearlyTop = top && second ? top.roi - second.roi >= REBALANCE_WIN_MARGIN : false;

  if (!clearlyTop) {
    return balancedDecision();
  }

  const topPriorStreak = priorByEngine.get(top.engine)?.consecutiveWinCycles ?? 0;
  const newWinStreak = topPriorStreak + 1;

  if (newWinStreak >= 2) {
    return ENGINES.map((engine) => {
      const isWinner = engine === top.engine;
      return {
        engine,
        status: isWinner ? "concentrated" : "heartbeat",
        weight: isWinner ? 1 - 2 * HEARTBEAT_WEIGHT : HEARTBEAT_WEIGHT,
        consecutiveWinCycles: 0,
        consecutiveMissCycles: 0,
      };
    });
  }

  // Partial progress toward concentration: record win streak, stay balanced.
  return ENGINES.map((engine) => ({
    engine,
    status: "balanced",
    weight: 1 / 3,
    consecutiveWinCycles: engine === top.engine ? newWinStreak : 0,
    consecutiveMissCycles: 0,
  }));
}

function balancedDecision(): EngineDecision[] {
  return ENGINES.map((engine) => ({
    engine,
    status: "balanced",
    weight: 1 / 3,
    consecutiveWinCycles: 0,
    consecutiveMissCycles: 0,
  }));
}

function startOfWeek(d: Date): Date {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  date.setUTCDate(date.getUTCDate() - diff);
  return date;
}

/**
 * Sunday cron entry point. Closes out the most recently completed week
 * (aggregates real DispatchJob activity into an EngineWeek row per
 * engine), applies decideRebalance against the last closed cycle, and
 * persists the new allocation as the current EngineWeek status/weight
 * for next week's dispatch guidance.
 */
export async function runWeeklyRebalance(now: Date = new Date()): Promise<RebalanceResult> {
  const thisWeekStart = startOfWeek(now);
  const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastWeekEnd = thisWeekStart;

  const jobs = await prisma.dispatchJob.findMany({
    where: { createdAt: { gte: lastWeekStart, lt: lastWeekEnd } },
    select: { engine: true, costToDate: true, revenueAttributed: true },
  });

  const actuals: EngineWeekActual[] = ENGINES.map((engine) => {
    const engineJobs = jobs.filter((j) => j.engine === engine);
    const spend = engineJobs.reduce((s, j) => s + Number(j.costToDate), 0);
    const revenue = engineJobs.reduce((s, j) => s + Number(j.revenueAttributed), 0);
    const roi = spend > 0 ? (revenue - spend) / spend : 0;
    return { engine, roi };
  });

  const priorRows = await prisma.engineWeek.findMany({
    where: { weekStart: lastWeekStart },
  });
  const priorByEngine = new Map(priorRows.map((r) => [r.engine as Engine, r]));

  // If last week has no row yet (first run ever), treat as balanced/no history.
  const prior: EnginePriorState[] = ENGINES.map((engine) => {
    const row = priorByEngine.get(engine);
    return {
      engine,
      status: (row?.status as EngineStatus) ?? "balanced",
      consecutiveWinCycles: row?.consecutiveWinCycles ?? 0,
      consecutiveMissCycles: row?.consecutiveMissCycles ?? 0,
    };
  });

  // Persist the actuals for last week (closing it out) before deciding.
  for (const actual of actuals) {
    const engineJobs = jobs.filter((j) => j.engine === actual.engine);
    const spend = engineJobs.reduce((s, j) => s + Number(j.costToDate), 0);
    const revenue = engineJobs.reduce((s, j) => s + Number(j.revenueAttributed), 0);
    await prisma.engineWeek.upsert({
      where: { engine_weekStart: { engine: actual.engine, weekStart: lastWeekStart } },
      update: { spend, revenue, roi: actual.roi },
      create: {
        engine: actual.engine,
        weekStart: lastWeekStart,
        spend,
        revenue,
        roi: actual.roi,
        status: "balanced",
      },
    });
  }

  const decisions = decideRebalance(prior, actuals);

  for (const decision of decisions) {
    await prisma.engineWeek.upsert({
      where: { engine_weekStart: { engine: decision.engine, weekStart: thisWeekStart } },
      update: {
        status: decision.status,
        consecutiveWinCycles: decision.consecutiveWinCycles,
        consecutiveMissCycles: decision.consecutiveMissCycles,
      },
      create: {
        engine: decision.engine,
        weekStart: thisWeekStart,
        spend: 0,
        revenue: 0,
        roi: 0,
        status: decision.status,
        consecutiveWinCycles: decision.consecutiveWinCycles,
        consecutiveMissCycles: decision.consecutiveMissCycles,
      },
    });
  }

  await appendAuditLog({
    actor: "apex.rebalance",
    action: "rebalance_applied",
    detail: { weekStart: thisWeekStart.toISOString(), decisions },
  });

  return {
    weekStart: thisWeekStart.toISOString(),
    allocations: decisions.map((d) => ({ engine: d.engine, weight: d.weight, status: d.status })),
  };
}

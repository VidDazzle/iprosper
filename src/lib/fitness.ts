/**
 * Evolve Fitness tracker — goals + logged accomplishments, with progress,
 * streaks, weekly counts, and personal bests computed from the log.
 */

import { db } from '@/db';
import { fitnessGoals, fitnessLogs, lifeProfiles } from '@/db/schema';
import { and, eq, desc, gte } from 'drizzle-orm';
import { pushNotification } from '@/lib/notifications';

type Goal = typeof fitnessGoals.$inferSelect;
type Log = typeof fitnessLogs.$inferSelect;

export const WORKOUT_KINDS = ['workout', 'strength', 'cardio', 'run'];

export interface GoalProgress {
  id: number; kind: string; label: string; unit: string | null;
  target: number; baseline: number | null; current: number; pct: number;
  status: string; deadline: string | null; achievedAt: string | null;
}

/** Current value toward a goal, derived from the log. */
function currentFor(goal: Goal, logs: Log[]): number {
  const since = goal.createdAt;
  switch (goal.kind) {
    case 'weight_loss':
    case 'weight_gain': {
      const weighins = logs.filter((l) => l.kind === 'weigh_in' && l.value != null).sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
      return weighins[0]?.value ?? goal.baselineValue ?? 0;
    }
    case 'workouts':
      return logs.filter((l) => WORKOUT_KINDS.includes(l.kind) && l.loggedAt >= since).length;
    case 'distance':
      return logs.filter((l) => (l.kind === 'run' || l.kind === 'cardio') && l.loggedAt >= since && l.value != null).reduce((s, l) => s + (l.value || 0), 0);
    case 'steps': {
      const steps = logs.filter((l) => l.kind === 'steps' && l.value != null).sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
      return steps[0]?.value ?? 0;
    }
    default: {
      // custom: latest matching-label value, else count.
      const matches = logs.filter((l) => (l.label || '').toLowerCase() === goal.label.toLowerCase());
      const withVal = matches.filter((l) => l.value != null).sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
      return withVal[0]?.value ?? matches.length;
    }
  }
}

function pctFor(goal: Goal, current: number): number {
  if (goal.kind === 'weight_loss') {
    const base = goal.baselineValue ?? current;
    if (base <= goal.targetValue) return 100;
    return Math.max(0, Math.min(100, Math.round(((base - current) / (base - goal.targetValue)) * 100)));
  }
  if (goal.kind === 'weight_gain') {
    const base = goal.baselineValue ?? current;
    if (goal.targetValue <= base) return 100;
    return Math.max(0, Math.min(100, Math.round(((current - base) / (goal.targetValue - base)) * 100)));
  }
  if (goal.targetValue <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / goal.targetValue) * 100)));
}

export function progressFor(goal: Goal, logs: Log[]): GoalProgress {
  const current = currentFor(goal, logs);
  return {
    id: goal.id, kind: goal.kind, label: goal.label, unit: goal.unit,
    target: goal.targetValue, baseline: goal.baselineValue, current, pct: pctFor(goal, current),
    status: goal.status, deadline: goal.deadline, achievedAt: goal.achievedAt,
  };
}

/** Consecutive days up to today with at least one log (in the profile's tz). */
function streakDays(logs: Log[], tz: string): number {
  const days = new Set(logs.map((l) => new Date(l.loggedAt).toLocaleDateString('en-CA', { timeZone: tz })));
  let streak = 0;
  const cur = new Date();
  for (;;) {
    const key = cur.toLocaleDateString('en-CA', { timeZone: tz });
    if (days.has(key)) { streak++; cur.setDate(cur.getDate() - 1); }
    else if (streak === 0 && key === new Date().toLocaleDateString('en-CA', { timeZone: tz })) { cur.setDate(cur.getDate() - 1); } // today empty: allow yesterday to start streak
    else break;
  }
  return streak;
}

function startOfWeekIso(): string {
  const now = new Date();
  const day = now.getDay(); // 0 Sun .. 6 Sat
  const d = new Date(now);
  d.setDate(d.getDate() - ((day + 6) % 7)); // back to Monday
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export interface FitnessSummary {
  streakDays: number;
  workoutsThisWeek: number;
  totalWorkouts: number;
  latestWeight: number | null;
  goals: GoalProgress[];
  recentLogs: { id: number; kind: string; label: string | null; value: number | null; unit: string | null; loggedAt: string }[];
  personalBests: { label: string; value: number; unit: string | null }[];
  weightSeries: { at: string; value: number }[];
  weeklyVolume: { weekStart: string; label: string; count: number }[];
}

export async function summary(profileId: number, tz = 'America/New_York'): Promise<FitnessSummary> {
  const logs = await db.select().from(fitnessLogs).where(eq(fitnessLogs.profileId, profileId)).orderBy(desc(fitnessLogs.loggedAt));
  const goals = await db.select().from(fitnessGoals).where(and(eq(fitnessGoals.profileId, profileId))).orderBy(desc(fitnessGoals.createdAt));

  const weekStart = startOfWeekIso();
  const workoutsThisWeek = logs.filter((l) => WORKOUT_KINDS.includes(l.kind) && l.loggedAt >= weekStart).length;
  const totalWorkouts = logs.filter((l) => WORKOUT_KINDS.includes(l.kind)).length;
  const weighins = logs.filter((l) => l.kind === 'weigh_in' && l.value != null);
  const latestWeight = weighins[0]?.value ?? null;

  // Personal bests: max value per label among valued logs (runs, lifts…).
  const best: Record<string, { value: number; unit: string | null }> = {};
  for (const l of logs) {
    if (l.value == null || !l.label) continue;
    if (l.kind === 'weigh_in') continue;
    const key = l.label;
    if (!best[key] || l.value > best[key].value) best[key] = { value: l.value, unit: l.unit };
  }
  const personalBests = Object.entries(best).map(([label, v]) => ({ label, value: v.value, unit: v.unit })).slice(0, 6);

  // Weight trend: weigh-ins oldest→newest (last 12).
  const weightSeries = logs
    .filter((l) => l.kind === 'weigh_in' && l.value != null)
    .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt))
    .slice(-12)
    .map((l) => ({ at: l.loggedAt, value: l.value as number }));

  // Weekly volume: workouts per week for the last 8 weeks (oldest→newest).
  const weekMs = 7 * 86400_000;
  const thisWeekStart = new Date(startOfWeekIso());
  const weeklyVolume: FitnessSummary['weeklyVolume'] = [];
  for (let i = 7; i >= 0; i--) {
    const start = new Date(thisWeekStart.getTime() - i * weekMs);
    const end = new Date(start.getTime() + weekMs);
    const count = logs.filter((l) => WORKOUT_KINDS.includes(l.kind) && l.loggedAt >= start.toISOString() && l.loggedAt < end.toISOString()).length;
    weeklyVolume.push({ weekStart: start.toISOString(), label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), count });
  }

  return {
    streakDays: streakDays(logs, tz),
    workoutsThisWeek,
    totalWorkouts,
    latestWeight,
    goals: goals.filter((g) => g.status !== 'archived').map((g) => progressFor(g, logs)),
    recentLogs: logs.slice(0, 12).map((l) => ({ id: l.id, kind: l.kind, label: l.label, value: l.value, unit: l.unit, loggedAt: l.loggedAt })),
    personalBests,
    weightSeries,
    weeklyVolume,
  };
}

/** After a log/goal change, flip any goal that reached 100% to achieved + notify. */
export async function reconcileGoals(profileId: number): Promise<void> {
  const logs = await db.select().from(fitnessLogs).where(eq(fitnessLogs.profileId, profileId));
  const goals = await db.select().from(fitnessGoals).where(and(eq(fitnessGoals.profileId, profileId), eq(fitnessGoals.status, 'active')));
  for (const g of goals) {
    if (pctFor(g, currentFor(g, logs)) >= 100) {
      await db.update(fitnessGoals).set({ status: 'achieved', achievedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).where(eq(fitnessGoals.id, g.id));
      await pushNotification(profileId, 'system', '🏆 Goal achieved!', `You hit your goal: ${g.label}. Amazing work.`, '/fitness');
    }
  }
}

export async function addLog(profileId: number, input: { kind: string; label?: string; value?: number; unit?: string; note?: string; loggedAt?: string }) {
  const now = new Date().toISOString();
  const inserted = await db.insert(fitnessLogs).values({
    profileId, kind: input.kind, label: input.label || null, value: input.value ?? null, unit: input.unit || null,
    note: input.note || null, loggedAt: input.loggedAt ? new Date(input.loggedAt).toISOString() : now, createdAt: now,
  }).returning();
  await reconcileGoals(profileId);
  return inserted[0];
}

export async function createGoal(profileId: number, input: { kind: string; label: string; targetValue: number; baselineValue?: number; unit?: string; deadline?: string }) {
  const now = new Date().toISOString();
  const inserted = await db.insert(fitnessGoals).values({
    profileId, kind: input.kind, label: input.label, targetValue: input.targetValue,
    baselineValue: input.baselineValue ?? null, unit: input.unit || null, deadline: input.deadline || null,
    status: 'active', createdAt: now, updatedAt: now,
  }).returning();
  return inserted[0];
}

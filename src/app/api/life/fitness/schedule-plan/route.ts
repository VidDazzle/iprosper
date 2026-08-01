import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateProfile } from '@/lib/life';
import { createEvent } from '@/lib/orbit';
import { getWorkoutPlan, type WorkoutGoal, type WorkoutLevel } from '@/lib/workouts';

/**
 * POST /api/life/fitness/schedule-plan { email?, goal, level?, weeks?, hour? }
 * Drops a workout routine's weekly sessions onto the Orbit calendar (with
 * reminders) for the next N weeks. Days map Mon..Sun -> the plan's day labels.
 */
const DAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const goal = body.goal as WorkoutGoal;
    if (!['lose_weight', 'gain_muscle', 'both', 'cardio'].includes(goal)) {
      return NextResponse.json({ error: 'valid goal required' }, { status: 400 });
    }
    const me = await getOrCreateProfile(body.email);
    const level = (['beginner', 'intermediate', 'advanced'].includes(body.level) ? body.level : 'beginner') as WorkoutLevel;
    const weeks = Math.max(1, Math.min(8, Number(body.weeks) || 4));
    const hour = Math.max(5, Math.min(21, Number(body.hour) || 18)); // default 6pm
    const plan = getWorkoutPlan(goal, level);

    let created = 0;
    const now = new Date();
    for (let w = 0; w < weeks; w++) {
      for (const d of plan.days) {
        const dow = DAY_INDEX[d.day] ?? 1;
        // Next occurrence of this weekday, plus w weeks.
        const start = new Date(now);
        const delta = (dow - now.getDay() + 7) % 7;
        start.setDate(now.getDate() + delta + w * 7);
        start.setHours(hour, 0, 0, 0);
        if (start.getTime() < now.getTime()) continue;
        const end = new Date(start.getTime() + 60 * 60_000);
        await createEvent(me.id, {
          title: `🏋️ ${d.focus}`,
          description: d.exercises.map((e) => `${e.name}: ${e.detail}`).join('\n'),
          startsAt: start.toISOString(), endsAt: end.toISOString(),
          category: 'fitness', source: 'fitness', reminderMinutes: 60, timezone: me.timezone,
        });
        created++;
      }
    }
    return NextResponse.json({ ok: true, created, weeks, goalLabel: plan.goalLabel }, { status: 201 });
  } catch (err) {
    console.error('POST /life/fitness/schedule-plan error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

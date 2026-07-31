import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateProfile } from '@/lib/life';
import { createGoal } from '@/lib/fitness';
import { getWorkoutPlan, type WorkoutGoal, type WorkoutLevel } from '@/lib/workouts';

/**
 * POST /api/life/fitness/start-plan { email?, goal, level? }
 * Start following a workout routine: auto-creates a matching Fitness goal (a
 * 4-week workout target) so progress tracks as you log sessions, and returns
 * the plan so the UI can show it with per-day "log" buttons.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const goal = body.goal as WorkoutGoal;
    if (!['lose_weight', 'gain_muscle', 'both', 'cardio'].includes(goal)) {
      return NextResponse.json({ error: 'valid goal required' }, { status: 400 });
    }
    const level = (['beginner', 'intermediate', 'advanced'].includes(body.level) ? body.level : 'beginner') as WorkoutLevel;
    const me = await getOrCreateProfile(body.email);
    const plan = getWorkoutPlan(goal, level);

    // A 4-week target based on the plan's weekly frequency.
    const target = plan.daysPerWeek * 4;
    const created = await createGoal(me.id, {
      kind: 'workouts',
      label: `${plan.goalLabel} plan — ${target} workouts (4 weeks)`,
      targetValue: target,
      unit: '',
    });

    return NextResponse.json({ goal: created, plan }, { status: 201 });
  } catch (err) {
    console.error('POST /life/fitness/start-plan error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

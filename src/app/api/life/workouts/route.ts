import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateProfile } from '@/lib/life';
import { preferencesGrouped } from '@/lib/life';
import { getWorkoutPlan, goalFromPreference, type WorkoutGoal, type WorkoutLevel } from '@/lib/workouts';

/**
 * GET /api/life/workouts?goal=&level=&email=
 * A goal-based workout plan (lose_weight | gain_muscle | both | cardio). If no
 * goal is passed, it's inferred from the person's onboarding fitness goal.
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const me = await getOrCreateProfile(url.searchParams.get('email'));
    let goal = url.searchParams.get('goal') as WorkoutGoal | null;
    if (!goal || !['lose_weight', 'gain_muscle', 'both', 'cardio'].includes(goal)) {
      const prefs = await preferencesGrouped(me.id);
      goal = goalFromPreference((prefs.fitness_goal || [])[0]);
    }
    const level = (url.searchParams.get('level') as WorkoutLevel) || 'beginner';
    const plan = getWorkoutPlan(goal, ['beginner', 'intermediate', 'advanced'].includes(level) ? level : 'beginner');
    return NextResponse.json(plan, { status: 200 });
  } catch (err) {
    console.error('GET /life/workouts error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

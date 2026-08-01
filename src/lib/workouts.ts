/**
 * Workout routine library for Evolve Life. Goal-based plans — lose weight, gain
 * muscle, both, or cardio — at three levels. General fitness guidance only;
 * every plan carries a safety note (see a professional before starting).
 */

export type WorkoutGoal = 'lose_weight' | 'gain_muscle' | 'both' | 'cardio';
export type WorkoutLevel = 'beginner' | 'intermediate' | 'advanced';

export const SAFETY_NOTE =
  'General fitness guidance, not medical advice. Warm up, use good form, and check with a doctor before starting a new program — especially with any injury or health condition.';

export interface Exercise { name: string; detail: string; }
export interface WorkoutDay { day: string; focus: string; exercises: Exercise[]; }
export interface WorkoutPlan {
  goal: WorkoutGoal;
  goalLabel: string;
  level: WorkoutLevel;
  daysPerWeek: number;
  summary: string;
  days: WorkoutDay[];
  tips: string[];
  safety: string;
}

const GOAL_LABEL: Record<WorkoutGoal, string> = {
  lose_weight: 'Lose weight',
  gain_muscle: 'Gain muscle',
  both: 'Build muscle & lean out',
  cardio: 'Cardio & endurance',
};

/** Scale sets/reps by level. */
function vol(level: WorkoutLevel, base: string): string {
  if (level === 'beginner') return base.replace('SETS', '2–3');
  if (level === 'advanced') return base.replace('SETS', '4–5');
  return base.replace('SETS', '3–4');
}

export function getWorkoutPlan(goal: WorkoutGoal, level: WorkoutLevel = 'beginner', daysPerWeek = 4): WorkoutPlan {
  const L = (b: string) => vol(level, b);
  let summary = '';
  let days: WorkoutDay[] = [];
  let tips: string[] = [];

  if (goal === 'lose_weight') {
    summary = 'Full-body strength to preserve muscle + HIIT/steady cardio to drive a calorie deficit.';
    days = [
      { day: 'Mon', focus: 'Full-body strength', exercises: [
        { name: 'Goblet squat', detail: L('SETS × 12') }, { name: 'Push-up (or incline)', detail: L('SETS × 10–15') },
        { name: 'Dumbbell row', detail: L('SETS × 12 each') }, { name: 'Plank', detail: L('SETS × 30–45s') } ] },
      { day: 'Tue', focus: 'HIIT cardio', exercises: [ { name: 'Intervals', detail: '10 × (30s hard / 60s easy) — bike, row, or run' }, { name: 'Cooldown walk', detail: '5–10 min' } ] },
      { day: 'Thu', focus: 'Full-body strength', exercises: [
        { name: 'Romanian deadlift', detail: L('SETS × 10') }, { name: 'Overhead press', detail: L('SETS × 10') },
        { name: 'Lat pulldown / band pulldown', detail: L('SETS × 12') }, { name: 'Reverse lunge', detail: L('SETS × 10 each') } ] },
      { day: 'Sat', focus: 'Steady cardio', exercises: [ { name: 'Zone-2 cardio', detail: '35–45 min brisk walk, jog, bike, or swim' } ] },
    ];
    tips = ['Aim for a small calorie deficit (~300–500/day) with high protein (~0.7–1 g/lb).', '7–9k+ steps daily moves the needle more than any single workout.', 'Prioritize sleep — it protects muscle and controls appetite.'];
  } else if (goal === 'gain_muscle') {
    summary = 'A push/pull/legs hypertrophy split — progressive overload, 6–12 rep range.';
    days = [
      { day: 'Mon', focus: 'Push (chest/shoulders/triceps)', exercises: [
        { name: 'Bench or dumbbell press', detail: L('SETS × 6–10') }, { name: 'Overhead press', detail: L('SETS × 8–10') },
        { name: 'Incline dumbbell press', detail: L('SETS × 10') }, { name: 'Triceps pushdown', detail: L('SETS × 12') } ] },
      { day: 'Tue', focus: 'Pull (back/biceps)', exercises: [
        { name: 'Pull-up or lat pulldown', detail: L('SETS × 8–10') }, { name: 'Barbell/dumbbell row', detail: L('SETS × 8–10') },
        { name: 'Face pull', detail: L('SETS × 15') }, { name: 'Biceps curl', detail: L('SETS × 12') } ] },
      { day: 'Thu', focus: 'Legs', exercises: [
        { name: 'Squat', detail: L('SETS × 6–10') }, { name: 'Romanian deadlift', detail: L('SETS × 8–10') },
        { name: 'Leg press or split squat', detail: L('SETS × 12') }, { name: 'Calf raise', detail: L('SETS × 15') } ] },
      { day: 'Fri', focus: 'Upper (accessory)', exercises: [
        { name: 'Incline press', detail: L('SETS × 10') }, { name: 'Cable row', detail: L('SETS × 12') },
        { name: 'Lateral raise', detail: L('SETS × 15') }, { name: 'Curls + triceps superset', detail: L('SETS × 12') } ] },
    ];
    tips = ['Add a little weight or a rep each week (progressive overload).', 'Eat in a slight surplus with ~0.8–1 g protein/lb bodyweight.', 'Leave 1–2 reps in the tank on most sets; rest 90–120s on big lifts.'];
  } else if (goal === 'both') {
    summary = 'Upper/lower strength for muscle + conditioning finishers to stay lean (body recomposition).';
    days = [
      { day: 'Mon', focus: 'Upper strength', exercises: [
        { name: 'Bench/DB press', detail: L('SETS × 8') }, { name: 'Row', detail: L('SETS × 8') },
        { name: 'Overhead press', detail: L('SETS × 10') }, { name: 'Finisher: 8-min EMOM', detail: 'burpees + rows' } ] },
      { day: 'Tue', focus: 'Lower strength', exercises: [
        { name: 'Squat', detail: L('SETS × 8') }, { name: 'Romanian deadlift', detail: L('SETS × 8') },
        { name: 'Split squat', detail: L('SETS × 10 each') }, { name: 'Finisher: sled/bike intervals', detail: '6 × 20s' } ] },
      { day: 'Thu', focus: 'Upper + conditioning', exercises: [
        { name: 'Pull-up/pulldown', detail: L('SETS × 8') }, { name: 'Incline press', detail: L('SETS × 10') },
        { name: 'Lateral raise + curls', detail: L('SETS × 12') }, { name: 'HIIT', detail: '10 × 30s/60s' } ] },
      { day: 'Sat', focus: 'Lower + core', exercises: [
        { name: 'Deadlift', detail: L('SETS × 6') }, { name: 'Leg press', detail: L('SETS × 12') },
        { name: 'Hanging knee raise', detail: L('SETS × 12') }, { name: 'Zone-2 cardio', detail: '20–30 min' } ] },
    ];
    tips = ['Recomp works best at maintenance calories with high protein.', 'Lift heavy for muscle; keep cardio as short finishers so it doesn’t eat recovery.', 'Track strength AND waist measurement — the scale can stay flat while you improve.'];
  } else {
    summary = 'A progressive endurance base (Zone 2) plus weekly intervals to raise your ceiling.';
    days = [
      { day: 'Mon', focus: 'Easy Zone-2', exercises: [ { name: 'Run/bike/row', detail: '30–40 min conversational pace' } ] },
      { day: 'Wed', focus: 'Intervals', exercises: [ { name: 'VO2 intervals', detail: '5–6 × (3 min hard / 3 min easy)' }, { name: 'Cooldown', detail: '5 min easy' } ] },
      { day: 'Fri', focus: 'Tempo', exercises: [ { name: 'Tempo effort', detail: '20 min at comfortably-hard pace' } ] },
      { day: 'Sun', focus: 'Long easy', exercises: [ { name: 'Long session', detail: '45–75 min easy — build 10%/week' } ] },
    ];
    tips = ['Keep ~80% of your cardio easy (Zone 2), ~20% hard.', 'Build weekly volume by no more than ~10% to avoid injury.', 'Strength-train 1–2×/week to stay durable.'];
  }

  return { goal, goalLabel: GOAL_LABEL[goal], level, daysPerWeek: days.length, summary, days: days.slice(0, daysPerWeek), tips, safety: SAFETY_NOTE };
}

/** Map a fitness_goal preference (from onboarding) to a workout goal. */
export function goalFromPreference(pref?: string): WorkoutGoal {
  const p = (pref || '').toLowerCase();
  if (p.includes('weight') || p.includes('lose') || p.includes('lean')) return 'lose_weight';
  if (p.includes('strength') || p.includes('muscle') || p.includes('build')) return 'gain_muscle';
  if (p.includes('race') || p.includes('run') || p.includes('endurance') || p.includes('cardio')) return 'cardio';
  return 'both';
}

/** Detect a workout goal from free text (concierge). Null when not a workout ask. */
export function workoutGoalFromText(text: string): WorkoutGoal | null {
  const t = text.toLowerCase();
  const isWorkout = /workout|exercise|routine|training plan|gym plan|weight ?lift|get (in )?shape|fitness plan/.test(t);
  const loseWeight = /lose weight|weight loss|lean out|burn fat|shred|slim down/.test(t);
  const muscle = /build muscle|gain muscle|bulk|get bigger|muscle mass|hypertrophy|get stronger/.test(t);
  // Cardio only counts as a workout ask when paired with a workout/goal cue —
  // "going for a run" alone should route to recreation, not a training plan.
  const cardio = /cardio|endurance|stamina|conditioning|couch ?to ?5k|train for a/.test(t);
  if (!isWorkout && !loseWeight && !muscle && !cardio) return null;
  if (loseWeight && muscle) return 'both';
  if (muscle) return 'gain_muscle';
  if (loseWeight) return 'lose_weight';
  if (cardio) return 'cardio';
  return 'both';
}

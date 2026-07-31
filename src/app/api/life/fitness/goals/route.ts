import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { fitnessGoals } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { getOrCreateProfile } from '@/lib/life';
import { createGoal, reconcileGoals } from '@/lib/fitness';

const KINDS = ['weight_loss', 'weight_gain', 'workouts', 'distance', 'steps', 'custom'];

/**
 * GET   /api/life/fitness/goals?email= -> all goals (raw).
 * POST  /api/life/fitness/goals        -> create { kind, label, targetValue, baselineValue?, unit?, deadline? }.
 * PATCH /api/life/fitness/goals        -> { id, status } (archive) or update fields.
 */
export async function GET(request: NextRequest) {
  try {
    const me = await getOrCreateProfile(new URL(request.url).searchParams.get('email'));
    const rows = await db.select().from(fitnessGoals).where(eq(fitnessGoals.profileId, me.id)).orderBy(desc(fitnessGoals.createdAt));
    return NextResponse.json({ goals: rows }, { status: 200 });
  } catch (err) {
    console.error('GET /life/fitness/goals error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!KINDS.includes(body.kind) || !body.label || body.targetValue == null) {
      return NextResponse.json({ error: 'kind, label, targetValue required' }, { status: 400 });
    }
    const me = await getOrCreateProfile(body.email);
    const goal = await createGoal(me.id, {
      kind: body.kind, label: String(body.label), targetValue: Number(body.targetValue),
      baselineValue: body.baselineValue != null ? Number(body.baselineValue) : undefined,
      unit: body.unit, deadline: body.deadline,
    });
    await reconcileGoals(me.id);
    return NextResponse.json({ goal }, { status: 201 });
  } catch (err) {
    console.error('POST /life/fitness/goals error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const me = await getOrCreateProfile(body.email);
    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (['active', 'achieved', 'archived'].includes(body.status)) patch.status = body.status;
    if (body.targetValue != null) patch.targetValue = Number(body.targetValue);
    if (body.deadline !== undefined) patch.deadline = body.deadline || null;
    const updated = await db.update(fitnessGoals).set(patch).where(and(eq(fitnessGoals.id, Number(body.id)), eq(fitnessGoals.profileId, me.id))).returning();
    return NextResponse.json({ goal: updated[0] || null }, { status: 200 });
  } catch (err) {
    console.error('PATCH /life/fitness/goals error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

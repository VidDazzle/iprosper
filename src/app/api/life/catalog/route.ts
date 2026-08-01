import { NextResponse } from 'next/server';
import { CATALOG, QUESTIONS } from '@/lib/life-catalog';

/** GET /api/life/catalog -> the onboarding questions + option lists to choose from. */
export async function GET() {
  return NextResponse.json({ questions: QUESTIONS, catalog: CATALOG }, { status: 200 });
}

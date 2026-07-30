import { NextResponse } from 'next/server';
import { runOptimizer } from '@/lib/prospecting/optimizer';

// Runs the autonomous performance optimizer: rescores products from outcomes,
// pauses chronic non-sellers, reactivates recovering ones. Safe to call from a
// scheduler (cron / Routine) as well as manually.
export async function POST() {
  try {
    const result = await runOptimizer();
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error: ' + error, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

// Read-only performance snapshot without mutating anything.
export async function GET() {
  try {
    const result = await runOptimizer();
    return NextResponse.json({ performance: result.performance }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error: ' + error, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

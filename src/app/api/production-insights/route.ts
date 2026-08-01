import { NextResponse } from 'next/server';
import { db } from '@/db';
import { workScores } from '@/db/schema';
import { generateProductionAdvice, aiConfigured } from '@/lib/ai';

/**
 * GET /api/production-insights
 *
 * Aggregates the 1-10 work-card scores into a quality picture — overall average,
 * averages by category, lowest performers, and a recent-vs-older trend — then
 * asks the AI for concrete recommendations to improve production (heuristic
 * fallback when the AI isn't configured). This is how client ratings feed back
 * into making better work.
 */
export async function GET() {
  try {
    const scores = await db.select().from(workScores);
    const total = scores.length;

    if (total === 0) {
      return NextResponse.json(
        { total: 0, overallAverage: null, byCategory: [], recommendations: ['No scores yet — start collecting 1-10 ratings on delivered work.'] },
        { status: 200 },
      );
    }

    const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
    const overallAverage = Number(avg(scores.map((s) => s.score)).toFixed(2));

    // By category.
    const cats: Record<string, number[]> = {};
    for (const s of scores) {
      const key = s.category || 'uncategorized';
      (cats[key] ||= []).push(s.score);
    }
    const byCategory = Object.entries(cats)
      .map(([category, vals]) => ({ category, count: vals.length, average: Number(avg(vals).toFixed(2)) }))
      .sort((a, b) => a.average - b.average);

    // Trend: last 20 vs previous.
    const sorted = [...scores].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const recent = sorted.slice(-20).map((s) => s.score);
    const older = sorted.slice(0, -20).map((s) => s.score);
    const trend = older.length
      ? Number((avg(recent) - avg(older)).toFixed(2))
      : null;

    // Recommendations: AI when available, else heuristic from the lowest category.
    const statsJson = JSON.stringify({ overallAverage, byCategory, trend });
    let recommendations = await generateProductionAdvice(statsJson);
    if (!recommendations) {
      recommendations = [];
      const worst = byCategory[0];
      if (worst && worst.average < 7) {
        recommendations.push(
          `"${worst.category}" is the lowest-rated category at ${worst.average}/10 — review recent ${worst.category} work and tighten quality checks there first.`,
        );
      }
      if (trend !== null && trend < -0.5) {
        recommendations.push(`Quality is trending down (${trend} vs prior work) — investigate what changed recently.`);
      }
      if (overallAverage >= 8.5) {
        recommendations.push(`Strong overall average (${overallAverage}/10) — capture what's working as a repeatable playbook.`);
      }
      if (recommendations.length === 0) {
        recommendations.push(`Overall average is ${overallAverage}/10. Add ANTHROPIC_API_KEY for AI-written improvement advice.`);
      }
    }

    return NextResponse.json(
      { total, overallAverage, byCategory, trend, recommendations, aiEnabled: aiConfigured() },
      { status: 200 },
    );
  } catch (error) {
    console.error('GET /production-insights error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

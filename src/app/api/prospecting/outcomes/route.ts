import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { outreachOutcomes, outreachMessages, prospects, suppressionList } from '@/db/schema';
import { desc, eq, sql } from 'drizzle-orm';

const VALID_OUTCOMES = ['no_response', 'reply', 'click', 'conversion', 'complaint', 'block'];

// Feedback loop input: record what happened to a sent message. Complaints and
// blocks auto-suppress the prospect. Conversions update prospect status.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { outreachId, outcome, revenueUsd, detail } = body;
    if (!outreachId || !VALID_OUTCOMES.includes(outcome)) {
      return NextResponse.json({ error: `outreachId and a valid outcome (${VALID_OUTCOMES.join(', ')}) are required`, code: 'INVALID' }, { status: 400 });
    }

    const [msg] = await db.select().from(outreachMessages).where(eq(outreachMessages.id, outreachId)).limit(1);
    if (!msg) {
      return NextResponse.json({ error: 'Outreach not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    const inserted = await db
      .insert(outreachOutcomes)
      .values({
        outreachId,
        outcome,
        revenueUsd: revenueUsd ?? null,
        detail: detail ?? null,
        occurredAt: body.occurredAt ?? nowIso,
        createdAt: nowIso,
      })
      .returning();

    const [prospect] = await db.select().from(prospects).where(eq(prospects.id, msg.prospectId)).limit(1);
    if (prospect) {
      if (outcome === 'conversion') {
        await db.update(prospects).set({ status: 'converted', updatedAt: nowIso }).where(eq(prospects.id, prospect.id));
      } else if (outcome === 'complaint' || outcome === 'block') {
        await db.update(prospects).set({ status: 'suppressed', updatedAt: nowIso }).where(eq(prospects.id, prospect.id));
        await db.insert(suppressionList).values({
          platform: prospect.platform,
          authorHandle: prospect.authorHandle,
          authorExternalId: prospect.authorExternalId,
          reason: `auto: ${outcome}`,
          source: outcome === 'complaint' ? 'complaint' : 'manual',
          createdAt: nowIso,
        });
      }
    }

    return NextResponse.json(inserted[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error: ' + error, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

// Aggregate outcomes by template variant + product for the self-optimizing loop.
export async function GET() {
  try {
    const byTemplate = await db
      .select({
        templateVariant: outreachMessages.templateVariant,
        outcome: outreachOutcomes.outcome,
        count: sql<number>`count(*)`,
        revenue: sql<number>`coalesce(sum(${outreachOutcomes.revenueUsd}), 0)`,
      })
      .from(outreachOutcomes)
      .innerJoin(outreachMessages, eq(outreachOutcomes.outreachId, outreachMessages.id))
      .groupBy(outreachMessages.templateVariant, outreachOutcomes.outcome);

    const recent = await db.select().from(outreachOutcomes).orderBy(desc(outreachOutcomes.createdAt)).limit(50);

    return NextResponse.json({ byTemplate, recent }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error: ' + error, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

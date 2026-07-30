import { NextResponse } from 'next/server';
import { db } from '@/db';
import { mentions, prospects, outreachMessages, outreachOutcomes, suppressionList } from '@/db/schema';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    const [mentionCounts, prospectCounts, outreachCounts, outcomeCounts, suppressionTotal] = await Promise.all([
      db.select({ status: mentions.status, count: sql<number>`count(*)` }).from(mentions).groupBy(mentions.status),
      db.select({ status: prospects.status, count: sql<number>`count(*)` }).from(prospects).groupBy(prospects.status),
      db.select({ status: outreachMessages.status, count: sql<number>`count(*)` }).from(outreachMessages).groupBy(outreachMessages.status),
      db.select({ outcome: outreachOutcomes.outcome, count: sql<number>`count(*)`, revenue: sql<number>`coalesce(sum(${outreachOutcomes.revenueUsd}),0)` }).from(outreachOutcomes).groupBy(outreachOutcomes.outcome),
      db.select({ count: sql<number>`count(*)` }).from(suppressionList),
    ]);

    const totalRevenue = outcomeCounts.reduce((sum, o) => sum + (o.revenue ?? 0), 0);

    return NextResponse.json(
      {
        mentions: mentionCounts,
        prospects: prospectCounts,
        outreach: outreachCounts,
        outcomes: outcomeCounts,
        suppressionTotal: suppressionTotal[0]?.count ?? 0,
        totalRevenue,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error: ' + error, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { connectors } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { PLATFORMS, type Platform } from '@/lib/prospecting/types';
import { credsFromEnv, getConnector } from '@/lib/prospecting/connectors';
import { PLATFORM_POLICIES } from '@/lib/prospecting/compliance';

export async function GET() {
  try {
    const rows = await db.select().from(connectors).orderBy(desc(connectors.updatedAt));
    // Annotate each configured platform with live capability info.
    const enriched = PLATFORMS.map((platform) => {
      const row = rows.find((r) => r.platform === platform);
      const connector = getConnector(platform);
      const configured = connector ? connector.isConfigured(credsFromEnv(platform)) : false;
      return {
        platform,
        implemented: Boolean(connector),
        credentialsPresent: configured,
        policy: PLATFORM_POLICIES[platform],
        record: row ?? null,
      };
    });
    return NextResponse.json(enriched, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error: ' + error, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, displayName, accountHandle, externalAccountId, status, scopes } = body;

    if (!platform || !PLATFORMS.includes(platform as Platform)) {
      return NextResponse.json({ error: 'Valid platform is required', code: 'INVALID_PLATFORM' }, { status: 400 });
    }
    if (!displayName || typeof displayName !== 'string') {
      return NextResponse.json({ error: 'displayName is required', code: 'MISSING_DISPLAY_NAME' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const [existing] = await db.select().from(connectors).where(eq(connectors.platform, platform)).limit(1);

    if (existing) {
      const updated = await db
        .update(connectors)
        .set({
          displayName,
          accountHandle: accountHandle ?? existing.accountHandle,
          externalAccountId: externalAccountId ?? existing.externalAccountId,
          status: status ?? existing.status,
          scopes: scopes ? JSON.stringify(scopes) : existing.scopes,
          updatedAt: nowIso,
        })
        .where(eq(connectors.id, existing.id))
        .returning();
      return NextResponse.json(updated[0], { status: 200 });
    }

    const inserted = await db
      .insert(connectors)
      .values({
        platform,
        displayName,
        accountHandle: accountHandle ?? null,
        externalAccountId: externalAccountId ?? null,
        status: status ?? 'disconnected',
        scopes: scopes ? JSON.stringify(scopes) : null,
        createdAt: nowIso,
        updatedAt: nowIso,
      })
      .returning();
    return NextResponse.json(inserted[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error: ' + error, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

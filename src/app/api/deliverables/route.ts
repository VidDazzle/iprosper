import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { deliverables } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { makeDeliverablePublicId, PROJECT_TYPES } from '@/lib/deliverables';

/**
 * GET  /api/deliverables   -> recent delivery packages
 * POST /api/deliverables   -> create a delivery package (draft)
 *   Body: { title, clientName?, clientEmail?, projectType?, message? }
 */

export async function GET() {
  try {
    const rows = await db.select().from(deliverables).orderBy(desc(deliverables.createdAt)).limit(100);
    return NextResponse.json({ deliverables: rows }, { status: 200 });
  } catch (error) {
    console.error('GET /deliverables error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }
    const projectType = PROJECT_TYPES.includes(body.projectType) ? body.projectType : 'other';
    const nowIso = new Date().toISOString();
    const inserted = await db
      .insert(deliverables)
      .values({
        publicId: makeDeliverablePublicId(),
        title: body.title.trim(),
        clientName: body.clientName || null,
        clientEmail: body.clientEmail ? String(body.clientEmail).trim().toLowerCase() : null,
        projectType,
        message: body.message || null,
        status: 'draft',
        createdAt: nowIso,
        updatedAt: nowIso,
      })
      .returning();
    return NextResponse.json({ deliverable: inserted[0] }, { status: 201 });
  } catch (error) {
    console.error('POST /deliverables error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

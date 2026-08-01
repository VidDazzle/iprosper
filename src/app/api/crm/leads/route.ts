import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { leads } from '@/db/schema';
import { desc } from 'drizzle-orm';

/**
 * GET  /api/crm/leads   -> captured leads (newest first)
 * POST /api/crm/leads   -> capture a lead (public — for capture forms, webinars)
 *   Body: { name, email?, phone?, company?, source?, message? }
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
}

export async function GET() {
  try {
    const rows = await db.select().from(leads).orderBy(desc(leads.createdAt)).limit(500);
    return NextResponse.json({ leads: rows }, { status: 200 });
  } catch (error) {
    console.error('GET /crm/leads error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400, headers: corsHeaders });
    }
    const inserted = await db
      .insert(leads)
      .values({
        name,
        email: body.email ? String(body.email).trim().toLowerCase() : null,
        phone: body.phone ? String(body.phone).trim() : null,
        company: body.company || null,
        source: body.source || 'capture_form',
        message: body.message || null,
        status: 'new',
        createdAt: new Date().toISOString(),
      })
      .returning();
    return NextResponse.json({ lead: inserted[0] }, { status: 201, headers: corsHeaders });
  } catch (error) {
    console.error('POST /crm/leads error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}

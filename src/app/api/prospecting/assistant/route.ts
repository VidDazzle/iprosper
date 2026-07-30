import { NextRequest, NextResponse } from 'next/server';
import { askAssistant } from '@/lib/prospecting/assistant';

// The operator-facing conversational endpoint. Text clients POST here directly;
// voice and email adapters transcribe/parse to text and call the same endpoint,
// so all three channels share one brain and one grounding context.
//
// body: { message: string, history?: [{role, content}] }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history } = body;
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message is required', code: 'MISSING_MESSAGE' }, { status: 400 });
    }
    const safeHistory = Array.isArray(history)
      ? history
          .filter((h) => h && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string')
          .slice(-8)
      : [];
    const result = await askAssistant(message, safeHistory);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error: ' + error, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

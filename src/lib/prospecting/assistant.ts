// Operator assistant. This is the conversational agent the OPERATOR (you) talks
// to — by text now, and via voice/email adapters that call the same endpoint.
// It answers questions about the products/services you're promoting and the
// money-making opportunities it has surfaced, grounded in your own database.
//
// This is explicitly an assistant FOR the operator. It is not the thing that
// talks to prospects, and it identifies itself as an AI.

import { db } from '@/db';
import { products, opportunities, outreachMessages, outreachOutcomes, prospects } from '@/db/schema';
import { desc, eq, sql } from 'drizzle-orm';

export interface AssistantContext {
  topProducts: Array<{ title: string; priorityScore: number; active: boolean; revenue: number }>;
  topOpportunities: Array<{ name: string; kind: string; score: number; estLow: number; estHigh: number; rationale: string | null; status: string }>;
  totals: { prospects: number; sent: number; conversions: number; revenue: number };
}

/** Gather a compact snapshot of the operator's business for grounding. */
export async function buildContext(): Promise<AssistantContext> {
  const prods = await db.select().from(products).orderBy(desc(products.priorityScore)).limit(8);

  const revByProduct = await db
    .select({ productId: outreachMessages.productId, revenue: sql<number>`coalesce(sum(${outreachOutcomes.revenueUsd}),0)` })
    .from(outreachMessages)
    .leftJoin(outreachOutcomes, eq(outreachOutcomes.outreachId, outreachMessages.id))
    .groupBy(outreachMessages.productId);
  const revMap = new Map(revByProduct.map((r) => [r.productId, Number(r.revenue)]));

  const opps = await db.select().from(opportunities).orderBy(desc(opportunities.score)).limit(8);

  const [prospectCount] = await db.select({ c: sql<number>`count(*)` }).from(prospects);
  const [sentCount] = await db.select({ c: sql<number>`count(*)` }).from(outreachMessages).where(eq(outreachMessages.status, 'sent'));
  const convRows = await db
    .select({ c: sql<number>`count(*)`, rev: sql<number>`coalesce(sum(${outreachOutcomes.revenueUsd}),0)` })
    .from(outreachOutcomes)
    .where(eq(outreachOutcomes.outcome, 'conversion'));

  return {
    topProducts: prods.map((p) => ({
      title: p.title,
      priorityScore: p.priorityScore,
      active: p.active,
      revenue: revMap.get(p.id) ?? 0,
    })),
    topOpportunities: opps.map((o) => ({
      name: o.name,
      kind: o.kind,
      score: o.score,
      estLow: o.estRevenueLowUsd ?? 0,
      estHigh: o.estRevenueHighUsd ?? 0,
      rationale: o.rationale,
      status: o.status,
    })),
    totals: {
      prospects: Number(prospectCount?.c ?? 0),
      sent: Number(sentCount?.c ?? 0),
      conversions: Number(convRows[0]?.c ?? 0),
      revenue: Number(convRows[0]?.rev ?? 0),
    },
  };
}

const MODEL = 'claude-haiku-4-5-20251001';

function systemPrompt(ctx: AssistantContext): string {
  return `You are ProsperPilot, an AI assistant for the operator of a compliant affiliate/dropshipping promotion system. You are talking to the operator (the business owner), not to prospects. Be concise, concrete, and honest — flag risks and never hype.

Current business snapshot (JSON):
${JSON.stringify(ctx, null, 2)}

Answer the operator's questions about these products, opportunities, and metrics. If asked to recommend where to focus, ground it in the priorityScore/revenue data above. If data is thin, say so.`;
}

export interface AssistantReply {
  reply: string;
  model: string;
  context: AssistantContext;
}

export async function askAssistant(message: string, history: Array<{ role: 'user' | 'assistant'; content: string }> = []): Promise<AssistantReply> {
  const context = await buildContext();
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return { reply: fallbackReply(message, context), model: 'fallback', context };
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 800,
        system: systemPrompt(context),
        messages: [...history.slice(-8), { role: 'user', content: message }],
      }),
    });
    if (!res.ok) return { reply: fallbackReply(message, context), model: 'fallback', context };
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const reply = data.content?.find((b) => b.type === 'text')?.text ?? fallbackReply(message, context);
    return { reply, model: MODEL, context };
  } catch {
    return { reply: fallbackReply(message, context), model: 'fallback', context };
  }
}

// Deterministic summary when no LLM is available, so the assistant still works.
function fallbackReply(message: string, ctx: AssistantContext): string {
  const lines: string[] = [];
  lines.push(`(ProsperPilot, no-LLM mode — here's a data summary for: "${message.slice(0, 120)}")`);
  lines.push('');
  lines.push('Top products by priority:');
  for (const p of ctx.topProducts.slice(0, 5)) {
    lines.push(`  • ${p.title} — score ${p.priorityScore.toFixed(0)}, revenue $${p.revenue.toFixed(0)}${p.active ? '' : ' (paused)'}`);
  }
  lines.push('');
  lines.push('Top opportunities:');
  for (const o of ctx.topOpportunities.slice(0, 5)) {
    lines.push(`  • ${o.name} (${o.kind}) — score ${o.score.toFixed(0)}, est $${o.estLow}-$${o.estHigh}/mo [${o.status}]`);
  }
  lines.push('');
  lines.push(`Totals: ${ctx.totals.prospects} prospects, ${ctx.totals.sent} sent, ${ctx.totals.conversions} conversions, $${ctx.totals.revenue.toFixed(0)} revenue.`);
  return lines.join('\n');
}

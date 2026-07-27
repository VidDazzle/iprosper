import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@apex/db";
import { loadEnv } from "@apex/config";
import { recordWebhookEvent } from "@apex/audit";
import { attributeRevenue } from "@apex/spend";
import { verifyGenericHmac } from "@/lib/webhookAuth";

const payloadSchema = z.object({
  id: z.string().min(1),
  leadId: z.string().min(1),
  amount: z.number().positive(),
});

/**
 * Affiliate revenue attribution (spec Section 1 & 8): "counts on
 * network-confirmed commission." No specific affiliate network is
 * named in the spec — same generic {id, leadId, amount} HMAC-signed
 * shape as invoice-paid. Adjust to match whatever real network gets
 * chosen.
 */
export async function POST(req: NextRequest) {
  const env = loadEnv();
  if (!env.AFFILIATE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "AFFILIATE_WEBHOOK_SECRET is not configured." }, { status: 503 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-signature");
  if (!signature || !verifyGenericHmac(rawBody, signature, env.AFFILIATE_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const parsed = payloadSchema.safeParse(JSON.parse(rawBody));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const isNew = await recordWebhookEvent("affiliate-network", parsed.data.id, "commission.confirmed", parsed.data);
  if (!isNew) {
    return NextResponse.json({ success: true, duplicate: true });
  }

  const job = await prisma.dispatchJob.findFirst({ where: { leadId: parsed.data.leadId } });
  if (!job) {
    return NextResponse.json({ error: `No DispatchJob found for leadId "${parsed.data.leadId}".` }, { status: 404 });
  }

  await attributeRevenue(job.id, parsed.data.amount);
  return NextResponse.json({ success: true });
}

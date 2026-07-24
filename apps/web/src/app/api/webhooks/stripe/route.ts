import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@apex/db";
import { loadEnv } from "@apex/config";
import { recordWebhookEvent } from "@apex/audit";
import { attributeRevenue } from "@apex/spend";

/**
 * Evolve revenue attribution (spec Section 1 & 8): "counts on Stripe
 * settlement." Uses Stripe's own SDK for signature verification
 * (constructEvent) rather than hand-rolled HMAC — this is real money
 * movement, so use the vendor-tested path, not a reimplementation.
 *
 * Expects `client_reference_id` on the Checkout Session to be set to
 * the DispatchJob id when the session is created (Evolve launches
 * aren't necessarily lead-based like the Rebrand Engine, so this keys
 * on the job directly rather than a leadId).
 */
export async function POST(req: NextRequest) {
  const env = loadEnv();
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    if (!signature) throw new Error("missing stripe-signature header");
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json(
      { error: `Signature verification failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 401 },
    );
  }

  const isNew = await recordWebhookEvent("stripe", event.id, event.type, event.data.object);
  if (!isNew) {
    return NextResponse.json({ success: true, duplicate: true });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const dispatchJobId = session.client_reference_id;
    const amount = (session.amount_total ?? 0) / 100; // Stripe amounts are in cents

    if (!dispatchJobId) {
      return NextResponse.json({ error: "Checkout session has no client_reference_id." }, { status: 400 });
    }

    const job = await prisma.dispatchJob.findUnique({ where: { id: dispatchJobId } });
    if (!job) {
      return NextResponse.json({ error: `No DispatchJob "${dispatchJobId}".` }, { status: 404 });
    }

    await attributeRevenue(job.id, amount);
  }

  return NextResponse.json({ success: true });
}

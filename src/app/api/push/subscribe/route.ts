import { NextRequest, NextResponse } from "next/server";
import { saveSubscription } from "@/lib/notify/subscriptions";
import { getSession } from "@/lib/portal/session";
import { getAttorneySession } from "@/lib/partners/session";

/** Expose the VAPID public key so the browser can create a subscription. */
export async function GET() {
  return NextResponse.json({ publicKey: process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null });
}

/**
 * Register a browser push subscription. The subject defaults to the signed-in
 * client; an explicit subject (e.g. "attorney:5") may be provided for an
 * authenticated partner dashboard.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sub = body.subscription;
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription." }, { status: 400 });
    }

    let subject: string | null = null;
    if (typeof body.subject === "string" && body.subject.startsWith("attorney:")) {
      // Attorney subjects require a matching attorney session.
      const att = await getAttorneySession();
      if (att && `attorney:${att.pid}` === body.subject) subject = body.subject;
    } else {
      const session = await getSession();
      if (session) subject = `client:${session.cid}`;
    }
    if (!subject) return NextResponse.json({ error: "No subject for this subscription." }, { status: 400 });

    await saveSubscription(subject, { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Could not save subscription." }, { status: 500 });
  }
}

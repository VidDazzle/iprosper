import { NextRequest, NextResponse } from "next/server";
import { recordLead, getPartner } from "@/lib/partners/store";
import { notifyAttorneyLead } from "@/lib/notify/dispatch";

/**
 * Log a verified client → attorney connection (call / text / notification).
 * Billed as a flat per-lead advertising fee, per the attorney's tier — never a
 * percentage of the attorney's fee or a referral fee.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const partnerId = Number(body.partnerId);
    const channel = body.channel;
    if (!partnerId || !["call", "text", "notification"].includes(channel)) {
      return NextResponse.json({ error: "partnerId and a valid channel are required." }, { status: 400 });
    }
    const lead = await recordLead({
      partnerId,
      channel,
      practiceArea: body.practiceArea ? String(body.practiceArea) : undefined,
      clientRef: body.clientRef ? String(body.clientRef) : "anonymous",
    });
    if (!lead) return NextResponse.json({ error: "Attorney not found." }, { status: 404 });

    // Ping the attorney instantly (push + email + SMS).
    const partner = await getPartner(partnerId);
    if (partner) await notifyAttorneyLead(partner, lead);

    return NextResponse.json({ success: true, leadId: lead.id });
  } catch {
    return NextResponse.json({ error: "Could not record the connection." }, { status: 500 });
  }
}

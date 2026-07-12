import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { isServiceableState } from "@/lib/agents/compliance";
import { sendMetaLeadEvent } from "@/lib/marketing/capi";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Capture an inbound lead from the site or a paid social / search ad.
 * Stores marketing attribution (UTM + click id) and TCPA contact consent so
 * Aria (the intake agent) can follow up compliantly.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: "A valid email is required.", code: "INVALID_EMAIL" },
        { status: 400 }
      );
    }

    const phone = body.phone ? String(body.phone).trim() : null;
    const contactConsent = Boolean(body.contactConsent);

    // TCPA: don't accept a phone number for outreach without express consent.
    if (phone && !contactConsent) {
      return NextResponse.json(
        {
          error: "Consent to be contacted is required to submit a phone number.",
          code: "CONSENT_REQUIRED",
        },
        { status: 400 }
      );
    }

    const stateCode = body.stateCode ? String(body.stateCode).toUpperCase().slice(0, 2) : null;
    const debtAmount =
      body.debtAmount != null && !Number.isNaN(Number(body.debtAmount))
        ? Math.round(Number(body.debtAmount))
        : null;
    const debtTypes = Array.isArray(body.debtTypes) ? JSON.stringify(body.debtTypes) : null;

    const attribution = body.attribution ?? {};
    const xff = request.headers.get("x-forwarded-for");
    const ip = xff ? xff.split(",")[0].trim() : request.headers.get("x-real-ip");

    // Flag (don't block) leads from states where we can't currently serve —
    // intake can still refer them to alternatives.
    const serviceable = stateCode ? isServiceableState(stateCode) : true;

    const inserted = await db
      .insert(leads)
      .values({
        name: body.name ? String(body.name).trim().slice(0, 120) : null,
        email,
        phone,
        debtAmount,
        debtTypes,
        payStatus: body.payStatus ? String(body.payStatus).slice(0, 40) : null,
        stateCode,
        contactConsent,
        source: attribution.source ?? null,
        medium: attribution.medium ?? null,
        campaign: attribution.campaign ?? null,
        adContent: attribution.adContent ?? null,
        term: attribution.term ?? null,
        referrer: attribution.referrer ?? null,
        landingPath: attribution.landingPath ?? null,
        clickId: attribution.clickId ?? null,
        status: serviceable ? "new" : "disqualified",
        ipAddress: ip ?? null,
        userAgent: request.headers.get("user-agent"),
        createdAt: new Date().toISOString(),
      })
      .returning({ id: leads.id });

    // Fire the server-side Meta Conversions API "Lead" event (deduplicated with
    // the browser Pixel via the shared eventId). No-ops if CAPI isn't configured.
    const eventId = randomUUID();
    if (serviceable) {
      await sendMetaLeadEvent({
        email,
        phone: phone ?? undefined,
        clickId: attribution.clickId,
        eventId,
        eventSourceUrl: attribution.landingPath ? `https://solvana.ai${attribution.landingPath}` : undefined,
        clientIp: ip,
        userAgent: request.headers.get("user-agent"),
        value: debtAmount ? Math.round(debtAmount * 0.2) : 0,
      });
    }

    return NextResponse.json(
      {
        success: true,
        leadId: inserted[0]?.id,
        eventId,
        serviceable,
        message: serviceable
          ? "Thanks — Aria will reach out shortly to see if you qualify."
          : "Thanks. Debt settlement may not be available in your state; we'll share alternatives.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Lead capture error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

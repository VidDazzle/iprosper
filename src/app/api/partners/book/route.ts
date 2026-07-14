import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getPartner, bookedIntervals, createAppointment } from "@/lib/partners/store";
import { computeSlots, fetchIcsBusy, generateIcs } from "@/lib/partners/scheduling";
import { notifyAttorneyAppointment, notifyClientBooking } from "@/lib/notify/dispatch";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Book a consultation. Re-validates the slot is still free (no double-booking),
 *  records the appointment, bills the flat per-appointment advertising fee, and
 *  returns a calendar invite (.ics). */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const partnerId = Number(body.partnerId);
    const partner = await getPartner(partnerId);
    if (!partner || !partner.calendarEnabled || !partner.availability) {
      return NextResponse.json({ error: "This attorney isn't taking online bookings." }, { status: 400 });
    }
    const clientName = String(body.clientName ?? "").trim();
    const clientEmail = String(body.clientEmail ?? "").trim().toLowerCase();
    const startUtc = String(body.startUtc ?? "");
    if (!clientName) return NextResponse.json({ error: "Your name is required." }, { status: 400 });
    if (!EMAIL_RE.test(clientEmail)) return NextResponse.json({ error: "A valid email is required." }, { status: 400 });

    // Re-validate the requested slot against fresh availability (prevents races).
    const [busy, booked] = await Promise.all([fetchIcsBusy(partner.busyIcsUrl), bookedIntervals(partnerId)]);
    const slots = computeSlots(partner.availability, busy, booked);
    const slot = slots.find((s) => s.startUtc === startUtc);
    if (!slot) return NextResponse.json({ error: "That time was just taken. Please pick another slot." }, { status: 409 });

    const appt = await createAppointment({
      partnerId, clientName, clientEmail,
      clientPhone: body.clientPhone ? String(body.clientPhone).trim() : undefined,
      topic: body.topic ? String(body.topic).trim() : "Debt / bankruptcy consultation",
      startUtc: slot.startUtc, endUtc: slot.endUtc,
    });

    const ics = generateIcs({
      uid: `${randomUUID()}@xdebt.ai`,
      start: slot.startUtc, end: slot.endUtc,
      summary: `Consultation with ${partner.firmName}`,
      description: `Free consultation with ${partner.attorneyName}, Esq. Booked via X Debt.${partner.phone ? ` Attorney phone: ${partner.phone}.` : ""}`,
      organizerEmail: partner.email, attendeeEmail: clientEmail,
      location: partner.phone ? `Phone: ${partner.phone}` : "Phone consultation",
    });

    // Ping the attorney instantly (push + email + SMS) and confirm to the client.
    const tz = partner.availability.timezone;
    await Promise.all([
      notifyAttorneyAppointment(partner, appt, slot.label, tz),
      notifyClientBooking(clientEmail, clientName, partner.firmName, slot.label, tz),
    ]);

    // Chronos also mirrors the event to the attorney's calendar and schedules
    // reminders. The .ics invite is returned for the client to add locally.
    return NextResponse.json({
      success: true,
      appointmentId: appt.id,
      when: slot.label,
      timezone: partner.availability.timezone,
      attorney: { firm: partner.firmName, name: partner.attorneyName, phone: partner.phone },
      icsBase64: Buffer.from(ics).toString("base64"),
      message: `You're booked with ${partner.firmName} for ${slot.label} (${partner.availability.timezone.replace("_", " ")}). A calendar invite is on its way.`,
    }, { status: 201 });
  } catch (e) {
    console.error("book error", e);
    return NextResponse.json({ error: "Could not book that appointment. Please try again." }, { status: 500 });
  }
}

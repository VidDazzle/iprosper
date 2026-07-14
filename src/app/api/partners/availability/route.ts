import { NextRequest, NextResponse } from "next/server";
import { getPartner, bookedIntervals } from "@/lib/partners/store";
import { computeSlots, fetchIcsBusy } from "@/lib/partners/scheduling";

export const dynamic = "force-dynamic";

/** Open appointment slots for an attorney: availability rules − calendar
 *  free/busy − already-booked consultations. */
export async function GET(request: NextRequest) {
  const partnerId = Number(request.nextUrl.searchParams.get("partnerId"));
  const partner = await getPartner(partnerId);
  if (!partner) return NextResponse.json({ error: "Attorney not found." }, { status: 404 });
  if (!partner.calendarEnabled || !partner.availability) {
    return NextResponse.json({ slots: [], calendarEnabled: false });
  }

  const [busy, booked] = await Promise.all([
    fetchIcsBusy(partner.busyIcsUrl),
    bookedIntervals(partnerId),
  ]);
  const slots = computeSlots(partner.availability, busy, booked);

  return NextResponse.json({
    calendarEnabled: true,
    timezone: partner.availability.timezone,
    provider: partner.calendarProvider ?? "manual",
    slots,
  });
}

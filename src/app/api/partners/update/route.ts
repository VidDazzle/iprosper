import { NextRequest, NextResponse } from "next/server";
import { getAttorneySession } from "@/lib/partners/session";
import { updatePartner } from "@/lib/partners/store";

/** Attorney self-service listing edit. An attorney can only edit their own listing. */
export async function POST(request: NextRequest) {
  const session = await getAttorneySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const b = await request.json();
    const patch: Parameters<typeof updatePartner>[1] = {};
    if (typeof b.bio === "string") patch.bio = b.bio.slice(0, 500);
    if (typeof b.phone === "string") patch.phone = b.phone.slice(0, 40) || undefined;
    if (typeof b.website === "string") patch.website = b.website.slice(0, 120) || undefined;
    if (Array.isArray(b.practiceAreas)) patch.practiceAreas = b.practiceAreas.map(String).slice(0, 10);
    if (typeof b.calendarEnabled === "boolean") patch.calendarEnabled = b.calendarEnabled;
    if (typeof b.busyIcsUrl === "string") patch.busyIcsUrl = b.busyIcsUrl.slice(0, 300) || undefined;
    if (b.availability && typeof b.availability === "object") {
      patch.availability = {
        days: Array.isArray(b.availability.days) ? b.availability.days : [1, 2, 3, 4, 5],
        startHour: Number(b.availability.startHour) || 9,
        endHour: Number(b.availability.endHour) || 17,
        slotMinutes: Number(b.availability.slotMinutes) || 30,
        timezone: String(b.availability.timezone || "America/Chicago"),
        horizonDays: 14, bufferMinutes: 15,
      };
      patch.calendarProvider = patch.busyIcsUrl ? "ics" : "manual";
    }
    const updated = await updatePartner(session.pid, patch);
    if (!updated) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Could not save your changes." }, { status: 500 });
  }
}

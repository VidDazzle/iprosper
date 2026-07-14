import { NextRequest, NextResponse } from "next/server";
import { createPartner } from "@/lib/partners/store";
import { generateBusinessCardSvg, svgToDataUrl } from "@/lib/partners/businesscard";
import { evaluateLeadBilling, type Tier, type LeadBillingModel } from "@/lib/partners/pricing";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BYTES = 3 * 1024 * 1024; // 3 MB per image

async function fileToDataUrl(file: File): Promise<string | undefined> {
  if (!(file instanceof File) || file.size === 0) return undefined;
  if (file.size > MAX_BYTES) throw new Error("Image must be under 3 MB.");
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "image/png";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const get = (k: string) => String(form.get(k) ?? "").trim();

    const firmName = get("firmName");
    const attorneyName = get("attorneyName");
    const email = get("email").toLowerCase();
    if (!firmName || !attorneyName) return NextResponse.json({ error: "Firm and attorney name are required." }, { status: 400 });
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "A valid email is required." }, { status: 400 });

    // Beacon compliance gate: only flat per-lead advertising billing is allowed.
    const requested = (get("billingModel") || "per_lead") as LeadBillingModel;
    const ruling = evaluateLeadBilling(requested);
    const billing = evaluateLeadBilling("per_lead"); // what we actually apply

    const practiceAreas = form.getAll("practiceAreas").map((v) => String(v)).filter(Boolean);
    const tier = (get("tier") || "featured") as Tier;

    const photoFile = form.get("photo");
    const cardFile = form.get("businessCard");
    const wantsGenerated = get("generateCard") === "true";

    let photoUrl: string | undefined;
    let businessCardUrl: string | undefined;
    try {
      photoUrl = photoFile instanceof File ? await fileToDataUrl(photoFile) : undefined;
      businessCardUrl = cardFile instanceof File ? await fileToDataUrl(cardFile) : undefined;
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed." }, { status: 400 });
    }

    // Beacon designs a card if none uploaded (or if the attorney asked for one).
    let businessCardGenerated = false;
    if (!businessCardUrl || wantsGenerated) {
      const svg = generateBusinessCardSvg({
        firmName, attorneyName, email, phone: get("phone"), website: get("website"),
        stateCode: get("stateCode"), practiceAreas, photoDataUrl: photoUrl,
      });
      businessCardUrl = svgToDataUrl(svg);
      businessCardGenerated = true;
    }

    // Calendar add-on (Chronos)
    const calendarEnabled = get("calendarEnabled") === "true";
    let availability: import("@/lib/partners/scheduling").Availability | undefined;
    if (calendarEnabled) {
      try {
        const parsed = JSON.parse(get("availability") || "{}");
        availability = {
          days: Array.isArray(parsed.days) && parsed.days.length ? parsed.days : [1, 2, 3, 4, 5],
          startHour: Number(parsed.startHour) || 9,
          endHour: Number(parsed.endHour) || 17,
          slotMinutes: Number(parsed.slotMinutes) || 30,
          timezone: parsed.timezone || "America/Chicago",
          horizonDays: Number(parsed.horizonDays) || 14,
          bufferMinutes: Number(parsed.bufferMinutes) || 15,
        };
      } catch { availability = undefined; }
    }

    const partner = await createPartner({
      firmName, attorneyName, email, phone: get("phone") || undefined, website: get("website") || undefined,
      barNumber: get("barNumber") || undefined, stateCode: get("stateCode") || undefined,
      practiceAreas, bio: get("bio") || undefined,
      photoType: (get("photoType") as "firm" | "self") || undefined, photoUrl,
      businessCardUrl, businessCardGenerated, tier,
      calendarEnabled,
      calendarProvider: calendarEnabled ? ((get("calendarProvider") as "google" | "ics" | "manual") || "manual") : undefined,
      busyIcsUrl: calendarEnabled ? (get("busyIcsUrl") || undefined) : undefined,
      availability,
    });

    return NextResponse.json({
      success: true,
      partnerId: partner.id,
      billing: { applied: billing, requestedRuling: ruling },
      message:
        "Application received. Beacon will verify your bar number and reach out to activate your listing. Advertising is billed with flat fees only — never a share of your legal fees.",
    }, { status: 201 });
  } catch (e) {
    console.error("partner apply error", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

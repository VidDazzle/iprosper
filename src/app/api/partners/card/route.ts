import { NextRequest, NextResponse } from "next/server";
import { generateBusinessCardSvg, svgToDataUrl } from "@/lib/partners/businesscard";

/** Live business-card preview for the apply form. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const svg = generateBusinessCardSvg({
      firmName: String(body.firmName || "Your Firm Name"),
      attorneyName: String(body.attorneyName || "Attorney Name"),
      email: String(body.email || "you@firm.com"),
      phone: body.phone ? String(body.phone) : undefined,
      website: body.website ? String(body.website) : undefined,
      stateCode: body.stateCode ? String(body.stateCode) : undefined,
      practiceAreas: Array.isArray(body.practiceAreas) ? body.practiceAreas.map(String) : [],
      photoDataUrl: body.photoDataUrl ? String(body.photoDataUrl) : undefined,
    });
    return NextResponse.json({ dataUrl: svgToDataUrl(svg) });
  } catch {
    return NextResponse.json({ error: "Could not generate card." }, { status: 500 });
  }
}

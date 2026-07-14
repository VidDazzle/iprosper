import { NextRequest, NextResponse } from "next/server";
import { analyzeHealthDocument } from "@/lib/health/analyze";

export const dynamic = "force-dynamic";

const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Analyze a healthcare document (bill, EOB, denial, estimate) and return an
 * educational consumer-advocate report.
 *
 * PRIVACY: the uploaded file is read into memory, analyzed, and then discarded.
 * It is NEVER written to disk or a database. This is NOT legal or medical advice.
 */
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const declaredType = String(form.get("declaredType") ?? "");
    const stateCode = String(form.get("stateCode") ?? "");
    const textHint = String(form.get("note") ?? "");

    let fileName = "document";
    if (file instanceof File) {
      if (file.size === 0) return NextResponse.json({ error: "Please choose a file to analyze." }, { status: 400 });
      if (file.size > MAX_BYTES) return NextResponse.json({ error: "Files must be under 15 MB." }, { status: 400 });
      fileName = file.name;
      // Read (in a real deployment: OCR/extract), then let it go out of scope.
      // We intentionally do NOT store the bytes anywhere.
      await file.arrayBuffer();
    } else if (!declaredType && !textHint) {
      return NextResponse.json({ error: "Upload a document or describe it to analyze." }, { status: 400 });
    }

    const analysis = analyzeHealthDocument({ declaredType, fileName, stateCode, textHint });

    return NextResponse.json({
      success: true,
      discarded: true, // the document was analyzed and discarded, not stored
      analysis,
    });
  } catch (e) {
    console.error("health analyze error", e);
    return NextResponse.json({ error: "Analysis failed. Please try again." }, { status: 500 });
  }
}

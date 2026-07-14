import { NextRequest, NextResponse } from "next/server";
import { compare } from "@/lib/lawarmor/compare";

export const dynamic = "force-dynamic";

/** Compare 2–4 offers/contracts and return an objective ranking. Any attached
 *  documents are analyzed for terms and discarded — never stored. Not advice. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const options = Array.isArray(body.options) ? body.options : [];
    if (options.length < 2) return NextResponse.json({ error: "Add at least two offers to compare." }, { status: 400 });
    if (options.length > 4) return NextResponse.json({ error: "Compare up to four at a time." }, { status: 400 });

    const result = compare(String(body.profileId ?? ""), options);
    if (!result) return NextResponse.json({ error: "Could not compare those offers." }, { status: 400 });
    return NextResponse.json({ success: true, result });
  } catch {
    return NextResponse.json({ error: "Comparison failed. Please try again." }, { status: 500 });
  }
}

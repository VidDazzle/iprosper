import { NextRequest, NextResponse } from "next/server";
import { AGREEMENT_VERSION } from "@/lib/consent/agreement";
import { consentFromRequest, consentIsCurrent } from "@/lib/consent/auth";

export const dynamic = "force-dynamic";

/** Report whether this visitor has a valid, current signed disclosure on file. */
export async function GET(request: NextRequest) {
  const token = consentFromRequest(request);
  const accepted = consentIsCurrent(token);
  return NextResponse.json({
    accepted,
    version: AGREEMENT_VERSION,
    name: accepted ? token!.name : null,
  });
}

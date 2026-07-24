// FTC disclosure check for affiliate posts (spec Section 3). This checks
// for the PRESENCE of a recognized disclosure marker — it does not (and
// cannot) certify legal sufficiency of placement/clarity under 16 CFR
// Part 255. Real compliance sign-off needs an actual legal review before
// this is trusted for anything that goes live; this is a floor, not a
// substitute for that review.

const DISCLOSURE_MARKERS = [
  "#ad",
  "#sponsored",
  "#affiliate",
  "paid partnership",
  "affiliate link",
  "we may earn a commission",
  "we earn a commission",
  "sponsored post",
];

export interface FtcDisclosureResult {
  passed: boolean;
  matchedMarker?: string;
  reason?: string;
}

export function checkFtcDisclosure(content: string): FtcDisclosureResult {
  const lower = content.toLowerCase();
  const matched = DISCLOSURE_MARKERS.find((marker) => lower.includes(marker));
  if (matched) {
    return { passed: true, matchedMarker: matched };
  }
  return {
    passed: false,
    reason: `No recognized FTC disclosure marker found. Expected one of: ${DISCLOSURE_MARKERS.join(", ")}`,
  };
}

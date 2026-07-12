/**
 * Marketing attribution — capture where a lead came from so paid-social and
 * search spend can be tied to enrollments.
 *
 * Standard UTM params plus platform click IDs (fbclid, ttclid, gclid, msclkid,
 * twclid). First-touch attribution is persisted to localStorage so it survives
 * navigation from an ad landing page to the qualify/enroll flow.
 */

export interface Attribution {
  source?: string; // utm_source → facebook, instagram, tiktok, youtube, google, x…
  medium?: string; // utm_medium → paid_social, cpc, video…
  campaign?: string; // utm_campaign
  adContent?: string; // utm_content (ad/creative id)
  term?: string; // utm_term (keyword)
  clickId?: string; // fbclid / ttclid / gclid / msclkid / twclid
  referrer?: string;
  landingPath?: string;
}

const STORAGE_KEY = "solvana_attribution";

const CLICK_ID_PARAMS: Array<[string, string]> = [
  ["fbclid", "facebook"],
  ["ttclid", "tiktok"],
  ["gclid", "google"],
  ["msclkid", "bing"],
  ["twclid", "x"],
];

/** Infer a channel from a click id when utm_source is absent. */
function inferSource(params: URLSearchParams): string | undefined {
  for (const [key, source] of CLICK_ID_PARAMS) {
    if (params.get(key)) return source;
  }
  return undefined;
}

/** Parse attribution from a query string (browser or server). */
export function parseAttribution(search: string, referrer = "", landingPath = ""): Attribution {
  const p = new URLSearchParams(search);
  const clickId =
    CLICK_ID_PARAMS.map(([k]) => p.get(k)).find(Boolean) ?? undefined;

  const attribution: Attribution = {
    source: p.get("utm_source") ?? inferSource(p) ?? undefined,
    medium: p.get("utm_medium") ?? (clickId ? "paid" : undefined),
    campaign: p.get("utm_campaign") ?? undefined,
    adContent: p.get("utm_content") ?? undefined,
    term: p.get("utm_term") ?? undefined,
    clickId: clickId ?? undefined,
    referrer: referrer || undefined,
    landingPath: landingPath || undefined,
  };

  // Drop undefined keys for a clean payload.
  return Object.fromEntries(
    Object.entries(attribution).filter(([, v]) => v != null && v !== "")
  ) as Attribution;
}

/** Client-side: capture first-touch attribution once and persist it. */
export function captureAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return JSON.parse(existing) as Attribution;

    const attribution = parseAttribution(
      window.location.search,
      document.referrer,
      window.location.pathname
    );
    if (Object.keys(attribution).length > 0) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
    }
    return attribution;
  } catch {
    return {};
  }
}

/** Client-side: read persisted attribution for submitting with a lead. */
export function getStoredAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : captureAttribution();
  } catch {
    return {};
  }
}

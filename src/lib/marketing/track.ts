/**
 * Client-side conversion event helpers. Fires the "Lead" event to whichever
 * pixels are present. Pass the same eventId returned by /api/leads so the
 * browser Pixel event dedups against the server-side CAPI event in Meta.
 */

type PixelFn = (...args: unknown[]) => void;
declare global {
  interface Window {
    fbq?: PixelFn;
    ttq?: { track: PixelFn };
    gtag?: PixelFn;
  }
}

export function trackLead(opts: { eventId?: string; value?: number } = {}) {
  if (typeof window === "undefined") return;
  const value = opts.value ?? 0;
  try {
    window.fbq?.("track", "Lead", { currency: "USD", value }, { eventID: opts.eventId });
    window.ttq?.track("SubmitForm", { value, currency: "USD" });
    window.gtag?.("event", "generate_lead", { currency: "USD", value });
  } catch {
    /* pixels are best-effort; never block the UX */
  }
}

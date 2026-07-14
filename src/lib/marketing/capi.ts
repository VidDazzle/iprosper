/**
 * Meta Conversions API (server-side) — fires a "Lead" event straight from our
 * server when a lead is captured, deduplicated with the browser Pixel via a
 * shared event_id. Server-side events survive ad blockers and iOS restrictions.
 *
 * All PII is SHA-256 hashed per Meta's requirements before it leaves our server.
 * No-ops safely when META_PIXEL_ID / META_CAPI_TOKEN are not configured.
 */

import crypto from "crypto";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export interface CapiLead {
  email?: string;
  phone?: string;
  clickId?: string; // fbclid
  eventId: string; // shared with the browser Pixel for dedup
  eventSourceUrl?: string;
  clientIp?: string | null;
  userAgent?: string | null;
  value?: number; // estimated lead value
}

export async function sendMetaLeadEvent(lead: CapiLead): Promise<{ sent: boolean; reason?: string }> {
  const pixelId = process.env.META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;
  if (!pixelId || !token) return { sent: false, reason: "not_configured" };

  const userData: Record<string, unknown> = {};
  if (lead.email) userData.em = [sha256(lead.email)];
  if (lead.phone) userData.ph = [sha256(lead.phone.replace(/[^0-9]/g, ""))];
  if (lead.clickId) userData.fbc = `fb.1.${Date.now()}.${lead.clickId}`;
  if (lead.clientIp) userData.client_ip_address = lead.clientIp;
  if (lead.userAgent) userData.client_user_agent = lead.userAgent;

  const payload = {
    data: [
      {
        event_name: "Lead",
        event_time: Math.floor(Date.now() / 1000),
        event_id: lead.eventId,
        action_source: "website",
        event_source_url: lead.eventSourceUrl,
        user_data: userData,
        custom_data: { currency: "USD", value: lead.value ?? 0, content_category: "debt_settlement" },
      },
    ],
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) return { sent: false, reason: `meta_${res.status}` };
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : "fetch_error" };
  }
}

/**
 * Notification dispatch — sends across email, SMS, and web push. Used to ping
 * attorneys the instant a client connects (a lead) or books a consultation.
 */

import { sendEmail, sendSms } from "./channels";
import { sendWebPush, type PushMessage } from "./webpush";
import { listForSubject, deleteEndpoint } from "./subscriptions";
import type { AttorneyPartner, AttorneyLead, AttorneyAppointment } from "@/lib/partners/store";

/** Push every subscription registered for a subject; prune dead ones. */
export async function pushToSubject(subject: string, msg: PushMessage): Promise<number> {
  const subs = await listForSubject(subject);
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      const r = await sendWebPush(s, msg);
      if (r.ok) sent++;
      if (r.gone) await deleteEndpoint(s.endpoint);
    })
  );
  return sent;
}

const CHANNEL_LABEL: Record<string, string> = { call: "call", text: "text", notification: "contact request" };

/** Ping an attorney the instant a client connects with them. */
export async function notifyAttorneyLead(partner: AttorneyPartner, lead: AttorneyLead): Promise<string[]> {
  const used: string[] = [];
  const area = lead.practiceArea ? ` about ${lead.practiceArea}` : "";
  const title = "New client connection on X Debt";
  const body = `A client just requested a ${CHANNEL_LABEL[lead.channel] ?? lead.channel}${area}. Follow up now while they're engaged.`;

  await pushToSubject(`attorney:${partner.id}`, { title, body, url: "https://xdebt.ai/attorneys", tag: "xdebt-lead", requireInteraction: true }).then((n) => n && used.push("push"));

  if (partner.email) {
    await sendEmail(partner.email, title,
      `<h2>${title}</h2><p>${body}</p><p style="color:#64748b;font-size:12px">Billed as a flat per-lead advertising fee. Manage your listing at xdebt.ai/attorneys.</p>`);
    used.push("email");
  }
  if (partner.phone) {
    await sendSms(partner.phone, `X Debt: new client connection (${lead.channel})${area}. Follow up now. Reply STOP to opt out.`);
    used.push("sms");
  }
  return used;
}

/** Ping an attorney the instant a client books a consultation. */
export async function notifyAttorneyAppointment(partner: AttorneyPartner, appt: AttorneyAppointment, whenLabel: string, tz: string): Promise<string[]> {
  const used: string[] = [];
  const title = "New consultation booked";
  const body = `${appt.clientName} booked a consultation for ${whenLabel} (${tz.replace("_", " ")})${appt.topic ? ` — ${appt.topic}` : ""}.`;

  await pushToSubject(`attorney:${partner.id}`, { title, body, url: "https://xdebt.ai/attorneys", tag: "xdebt-appt", requireInteraction: true }).then((n) => n && used.push("push"));

  if (partner.email) {
    await sendEmail(partner.email, title,
      `<h2>${title}</h2><p>${body}</p><p>Client: ${appt.clientName} · ${appt.clientEmail}${appt.clientPhone ? ` · ${appt.clientPhone}` : ""}</p><p style="color:#64748b;font-size:12px">A calendar invite has been sent. Billed as a flat per-appointment advertising fee.</p>`);
    used.push("email");
  }
  if (partner.phone) {
    await sendSms(partner.phone, `X Debt: ${appt.clientName} booked a consult for ${whenLabel}. Details emailed. Reply STOP to opt out.`);
    used.push("sms");
  }
  return used;
}

/** Confirm a booking to the client. */
export async function notifyClientBooking(clientEmail: string, clientName: string, firmName: string, whenLabel: string, tz: string): Promise<void> {
  await sendEmail(clientEmail, `Your consultation with ${firmName} is booked`,
    `<h2>You're booked, ${clientName}</h2><p>Your free consultation with <strong>${firmName}</strong> is set for <strong>${whenLabel}</strong> (${tz.replace("_", " ")}).</p><p>A calendar invite is attached. They'll reach out at the scheduled time.</p><p style="color:#64748b;font-size:12px">Booked via X Debt. X Debt is not a law firm and does not endorse any attorney.</p>`);
}

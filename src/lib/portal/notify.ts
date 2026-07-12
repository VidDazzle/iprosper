/**
 * Notification delivery for approval requests. Generates signed one-click
 * approve/reject links and "sends" them by email and/or SMS, and records an
 * in-app notification. Email/SMS providers are pluggable and no-op with a log
 * line when unconfigured (same graceful pattern as the ad pixels/CAPI).
 *
 * Configure: RESEND_API_KEY / SENDGRID_API_KEY (email), TWILIO_* (SMS),
 * NEXT_PUBLIC_SITE_URL (link base).
 */

import { createApprovalToken } from "./auth";
import { addNotification, type ApprovalRecord, type PortalUser } from "./store";

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://solvana.ai";
}

export function approvalLinks(approvalId: number) {
  const base = siteUrl();
  return {
    approve: `${base}/api/portal/approve?token=${createApprovalToken(approvalId, "approve")}`,
    reject: `${base}/api/portal/approve?token=${createApprovalToken(approvalId, "reject")}`,
    portal: `${base}/portal/approvals`,
  };
}

async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[notify:email → ${to}] ${subject}\n${body}`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "Solvana <notify@solvana.ai>", to, subject, html: body }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function sendSms(to: string, body: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) {
    console.log(`[notify:sms → ${to}] ${body}`);
    return false;
  }
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Send an approval request across the client's chosen channels. Returns the
 *  list of channels that were actually attempted (email/sms/in-app). */
export async function sendApprovalRequest(approval: ApprovalRecord, user: PortalUser): Promise<string[]> {
  const links = approvalLinks(approval.id);
  const channels: string[] = ["in-app"];

  // Always record an in-app notification.
  await addNotification(user.opsClientId, `${approval.title} — your approval is needed.`, "/portal/approvals");

  if (user.notifyEmail && user.email) {
    const html = `
      <h2>${approval.title}</h2>
      <p>${approval.detail}</p>
      <p style="margin:24px 0">
        <a href="${links.approve}" style="background:#22d3ee;color:#03040a;padding:12px 22px;border-radius:9999px;text-decoration:none;font-weight:600">Approve</a>
        &nbsp;&nbsp;
        <a href="${links.reject}" style="color:#94a3b8;padding:12px 22px;text-decoration:none">Decline</a>
      </p>
      <p style="font-size:12px;color:#64748b">Or review in your portal: ${links.portal}. This link expires in 7 days.</p>`;
    await sendEmail(user.email, `Action needed: ${approval.title}`, html);
    channels.push("email");
  }

  if (user.notifySms && user.phone) {
    const sms = `Solvana: ${approval.title}. Approve: ${links.approve} · Decline: ${links.reject}. Reply STOP to opt out.`;
    await sendSms(user.phone, sms);
    channels.push("sms");
  }

  return channels;
}

import { loadEnv, isChannelLive } from "@apex/config";

export interface NotifyOwnerResult {
  smsSent: boolean;
  emailSent: boolean;
}

/**
 * Sends a message directly to the owner via SMS and/or email — used
 * for autonomous-approval requests (packages/scout/autonomousApproval)
 * and real-time kill-switch alerts. Same fail-loud pattern as every
 * outbound channel already in this system (see
 * packages/pipeline/closer.ts): dry-run or unconfigured logs and does
 * nothing; live-but-no-provider throws rather than faking a send. No
 * SMS/email provider is wired up anywhere in this build yet — Closer's
 * own channels are in the identical state — this becomes real the
 * moment one is (Twilio/SendGrid/etc.), same as every other credential
 * in this system.
 */
export async function notifyOwner(subject: string, body: string): Promise<NotifyOwnerResult> {
  const env = loadEnv();
  let smsSent = false;
  let emailSent = false;

  if (env.OWNER_PHONE_NUMBER) {
    if (isChannelLive("sms")) {
      throw new Error(
        "SMS_ENABLED is true but no SMS provider is configured in this build — refusing to fake a send. Wire a real provider before enabling this channel.",
      );
    }
    console.info(`[owner-alert:dry-run] would SMS ${env.OWNER_PHONE_NUMBER}:\n${subject}\n${body}`);
  }

  if (env.OWNER_EMAIL) {
    if (isChannelLive("email")) {
      throw new Error(
        "EMAIL_ENABLED is true but no email provider is configured in this build — refusing to fake a send. Wire a real provider before enabling this channel.",
      );
    }
    console.info(`[owner-alert:dry-run] would email ${env.OWNER_EMAIL}:\n${subject}\n${body}`);
  }

  return { smsSent, emailSent };
}

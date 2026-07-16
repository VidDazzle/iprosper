import { db } from '@/db';
import { mailMessages } from '@/db/schema';
import { and, eq, like } from 'drizzle-orm';

/**
 * First-contact welcome message.
 *
 * The very first time Evolve emails a given recipient, this banner is prepended
 * to the message body so every new client sees it once. Applies to mail sent
 * from the UI, the API, and the voice agent (all go through the send path).
 *
 * Override the copy with the WELCOME_MESSAGE env var.
 */
const DEFAULT_WELCOME_MESSAGE =
  "We ditched our other email providers because they weren't secure enough and " +
  "they didn't rock like Evolve!!!";

export function getWelcomeMessage(): string {
  return process.env.WELCOME_MESSAGE || DEFAULT_WELCOME_MESSAGE;
}

/**
 * True if we have never sent this address an outbound email before. Recipient
 * addresses are stored in plaintext (only subject/body are encrypted), so this
 * is a cheap lookup.
 */
export async function isFirstContact(recipient: string): Promise<boolean> {
  const addr = recipient.trim().toLowerCase();
  if (!addr) return false;
  const prior = await db
    .select({ id: mailMessages.id })
    .from(mailMessages)
    .where(and(eq(mailMessages.direction, 'outbound'), like(mailMessages.toEmails, `%${addr}%`)))
    .limit(1);
  return prior.length === 0;
}

/** True if any recipient in the list has never been emailed before. */
export async function anyFirstContact(recipients: string[]): Promise<boolean> {
  for (const r of recipients) {
    if (await isFirstContact(r)) return true;
  }
  return false;
}

/**
 * How many outbound emails we've already sent this recipient. Used to sequence
 * the rotating sign-off taglines (2nd email → count 1 → first tagline).
 */
export async function outboundCountTo(recipient: string): Promise<number> {
  const addr = recipient.trim().toLowerCase();
  if (!addr) return 0;
  const rows = await db
    .select({ id: mailMessages.id })
    .from(mailMessages)
    .where(and(eq(mailMessages.direction, 'outbound'), like(mailMessages.toEmails, `%${addr}%`)));
  return rows.length;
}

/** Prepend the welcome banner to a body, keeping a clean separation. */
export function prependWelcome(body: string): string {
  return `${getWelcomeMessage()}\n\n—\n\n${body}`;
}

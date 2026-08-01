/**
 * Funny, catchy Evolve sign-off one-liners.
 *
 * Email #1 to a new recipient gets the welcome banner (see welcome.ts). From
 * the SECOND email onward, each outbound message signs off with the next
 * one-liner in this list, rotating per recipient so a client sees a fresh gag
 * every time. Cycles back to the top once exhausted.
 *
 * Keep #0 first — it's the one that lands on every client's second email.
 * Add/remove lines freely; order is the send order.
 */
export const TAGLINES: string[] = [
  "Truth be known, we're AI snobs.",
  "Encrypted so hard that even we have no clue what this says. You're welcome.",
  "Powered by robots, perfected by Evolve, judged by no one.",
  "This email flew first-class, fully encrypted, zero layovers, unlike your last flight.",
  "Your privacy is locked in a vault we conveniently lost the key to.",
  "Evolve: your inbox's slightly overqualified bodyguard.",
  "Bank-grade security, food-truck-level charm, zero-calorie sarcasm.",
  "Warning: contains dangerously good AI and mild delusions of grandeur.",
  "If this email were any more secure, it'd need its own passport and a bad headshot.",
  "We put the smart in your inbox and the snob in our AI.",
  "Other email providers are quaking. We checked. They're fine, but still.",
  "Sent with love, encryption, and an unreasonable amount of confidence.",
];

/** Pick the tagline for a given zero-based position, wrapping around the list. */
export function pickTagline(index: number): string {
  const i = ((index % TAGLINES.length) + TAGLINES.length) % TAGLINES.length;
  return TAGLINES[i];
}

/** Append a tagline as a sign-off line at the bottom of a message body. */
export function appendTagline(body: string, tagline: string): string {
  return `${body}\n\n— ${tagline}`;
}

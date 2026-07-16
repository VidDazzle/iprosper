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
  "Sent from Evolve — our AI read this faster than you can say “unsubscribe.”",
  "Our encryption is so tight, even we can't read this. (Kidding. Mostly.)",
  "Powered by robots, perfected by Evolve.",
  "This email flew first-class, fully encrypted, zero layovers.",
  "No servers were snooped in the making of this message.",
  "Evolve: because your inbox deserves a bodyguard.",
  "Our AI booked three meetings while you read this sentence.",
  "Bank-grade security, food-truck-level charm.",
  "Warning: contains dangerously good AI.",
  "If this email were any more secure, it'd need a passport.",
  "We put the smart in your inbox and the snob in our AI.",
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

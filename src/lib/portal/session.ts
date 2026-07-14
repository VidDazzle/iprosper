import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken, type SessionData } from "./auth";

/** Read the current portal session from the cookie (server components/routes). */
export async function getSession(): Promise<SessionData | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

/** Require a session or redirect to sign-in. Returns the session when present. */
export async function requireSession(): Promise<SessionData> {
  const session = await getSession();
  if (!session) redirect("/portal/signin");
  return session;
}

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ATTORNEY_COOKIE, verifyAttorneyToken, type AttorneySession } from "./auth";

export async function getAttorneySession(): Promise<AttorneySession | null> {
  const store = await cookies();
  return verifyAttorneyToken(store.get(ATTORNEY_COOKIE)?.value);
}

export async function requireAttorney(): Promise<AttorneySession> {
  const session = await getAttorneySession();
  if (!session) redirect("/attorneys/login");
  return session;
}

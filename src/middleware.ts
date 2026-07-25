import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/viralhive/auth";

// verifySessionToken uses node:crypto (HMAC), which the default Edge
// middleware runtime doesn't support — run this middleware on Node.js instead.
export const runtime = "nodejs";

// Guards the dashboard pages AND the server actions invoked from them
// (Next.js posts server-action calls back to the originating page route, so
// this one matcher covers both). The Vercel-Cron endpoint is a separate API
// route authenticated by its own bearer secret, not a browser session.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/viralhive") || pathname === "/viralhive/login") {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (verifySessionToken(token)) return NextResponse.next();

  const loginUrl = new URL("/viralhive/login", req.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/viralhive/:path*"],
};

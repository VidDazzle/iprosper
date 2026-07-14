import Link from "next/link";
import { SolvanaLogo } from "@/components/solvana/nav";
import { listNotifications } from "@/lib/portal/store";
import type { SessionData } from "@/lib/portal/auth";
import { LayoutDashboard, FileText, CheckSquare, Activity, Bell } from "lucide-react";
import LogoutButton from "./logout-button";

const NAV = [
  { href: "/portal", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portal/documents", label: "Documents", icon: FileText },
  { href: "/portal/approvals", label: "Approvals", icon: CheckSquare },
  { href: "/portal/activity", label: "Activity", icon: Activity },
];

export default async function PortalShell({
  session,
  children,
}: {
  session: SessionData;
  children: React.ReactNode;
}) {
  const notifications = await listNotifications(session.cid);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-[#050810] text-slate-200">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#03040a]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-6">
            <Link href="/portal"><SolvanaLogo /></Link>
            <nav className="hidden items-center gap-1 md:flex">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <n.icon className="h-4 w-4" />
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/portal" className="relative text-slate-400 hover:text-white">
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-400 px-1 text-[10px] font-bold text-[#03040a]">
                  {unread}
                </span>
              )}
            </Link>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-white">{session.name}</p>
              <p className="text-xs text-slate-500">{session.cid}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
        {/* Mobile nav */}
        <nav className="flex items-center gap-1 overflow-x-auto border-t border-white/5 px-4 py-2 md:hidden">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:text-white">
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}

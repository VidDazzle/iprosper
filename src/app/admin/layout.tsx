import type { Metadata } from "next";
import Link from "next/link";
import { SolvanaLogo } from "@/components/solvana/nav";
import { LayoutDashboard, Users, Megaphone, Bot, BarChart3, ShieldCheck, CheckSquare, FileText } from "lucide-react";
import { requireAdmin } from "@/lib/admin/session";
import AdminLogoutButton from "@/components/admin/logout-button";

export const metadata: Metadata = {
  title: "Operations Console | Solvana",
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/clients", label: "Client cases", icon: Users },
  { href: "/admin/approvals", label: "Approvals", icon: CheckSquare },
  { href: "/admin/documents", label: "Documents", icon: FileText },
  { href: "/admin/reports", label: "Analytics", icon: BarChart3 },
  { href: "/admin/agents", label: "AI agents", icon: Bot },
  { href: "/admin/leads", label: "Leads & marketing", icon: Megaphone },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="min-h-screen bg-[#050810] font-sans text-slate-200">
      <div className="flex">
        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-60 flex-shrink-0 flex-col border-r border-white/10 bg-[#03040a] p-5 md:flex">
          <Link href="/" className="mb-8">
            <SolvanaLogo />
          </Link>
          <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
            Operations
          </p>
          <nav className="flex flex-col gap-1">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto space-y-3">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-300">
              <ShieldCheck className="mb-1 h-4 w-4" />
              Sentinel: all agent actions screened &amp; logged
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-white">{admin.email}</p>
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Staff</p>
              </div>
              <AdminLogoutButton />
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="min-w-0 flex-1">
          {/* Mobile top nav */}
          <div className="flex items-center gap-4 overflow-x-auto border-b border-white/10 bg-[#03040a] px-4 py-3 md:hidden">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="whitespace-nowrap text-sm text-slate-400 hover:text-white">
                {n.label}
              </Link>
            ))}
            <AdminLogoutButton />
          </div>
          <main className="p-5 md:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

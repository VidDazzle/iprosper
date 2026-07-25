import Link from "next/link";
import { logoutAction } from "@/lib/viralhive/actions";
import { Button } from "@/components/ui/button";

// Every dashboard page reads live DB state (accounts, campaigns, run log,
// etc.) and is gated by auth — never statically prerender it.
export const dynamic = "force-dynamic";

const NAV = [
  { href: "/viralhive", label: "Overview" },
  { href: "/viralhive/accounts", label: "Accounts" },
  { href: "/viralhive/campaigns", label: "Campaigns" },
  { href: "/viralhive/products", label: "Products" },
  { href: "/viralhive/providers", label: "Providers" },
  { href: "/viralhive/settings", label: "Settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <span className="text-lg font-bold tracking-tight">ViralHive</span>
            <nav className="flex gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-1.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="sm">
              Log out
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SolvanaLogo } from "@/components/solvana/nav";
import AdminLoginForm from "@/components/admin/login-form";
import { getAdminSession } from "@/lib/admin/session";
import { adminAuthConfigured } from "@/lib/admin/auth";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Staff Sign In | X Debt",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  if (await getAdminSession()) redirect("/admin");
  const configured = adminAuthConfigured();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050810] px-6 py-12 font-sans">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <SolvanaLogo />
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" /> Operations Console
          </div>
          <h1 className="mt-4 text-2xl font-bold text-white">Staff sign in</h1>
          <p className="mt-1 text-sm text-slate-400">Authorized personnel only.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur">
          <AdminLoginForm />
          {!configured && (
            <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-center text-xs text-amber-200/80">
              Dev mode: <span className="text-amber-200">admin@xdebt.ai</span> / <span className="text-amber-200">admin1234</span>.
              Set ADMIN_EMAIL and ADMIN_PASSWORD_HASH to secure this in production.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

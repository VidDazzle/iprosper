import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SolvanaLogo } from "@/components/solvana/nav";
import AttorneyLoginForm from "@/components/partners/login-form";
import { getAttorneySession } from "@/lib/partners/session";
import { Scale } from "lucide-react";

export const metadata: Metadata = { title: "Attorney Sign In | X Debt", robots: { index: false, follow: false } };

export default async function AttorneyLoginPage() {
  if (await getAttorneySession()) redirect("/partner");
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050810] px-6 py-12 font-sans">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <SolvanaLogo />
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">
            <Scale className="h-3.5 w-3.5 text-amber-300" /> Attorney Dashboard
          </div>
          <h1 className="mt-4 text-2xl font-bold text-white">Advertiser sign in</h1>
          <p className="mt-1 text-sm text-slate-400">Manage your listing, leads, and calendar.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur">
          <AttorneyLoginForm />
        </div>
      </div>
    </div>
  );
}

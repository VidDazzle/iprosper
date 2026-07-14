import Link from "next/link";
import { redirect } from "next/navigation";
import { SolvanaLogo } from "@/components/solvana/nav";
import { SignInForm } from "@/components/portal/auth-forms";
import { getSession } from "@/lib/portal/session";

export default async function SignInPage() {
  if (await getSession()) redirect("/portal");
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050810] px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block"><SolvanaLogo /></Link>
          <h1 className="mt-6 text-2xl font-bold text-white">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-400">Sign in to see your case, documents, and approvals.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur">
          <SignInForm />
        </div>
      </div>
    </div>
  );
}

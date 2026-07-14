import type { Metadata } from "next";
import Link from "next/link";
import SolvanaNav from "@/components/solvana/nav";
import SolvanaFooter from "@/components/solvana/footer";
import AttorneyCard from "@/components/partners/attorney-card";
import { listActivePartners } from "@/lib/partners/store";
import { pageMetadata } from "@/lib/solvana/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  title: "Find a Debt or Bankruptcy Attorney",
  description:
    "Connect with vetted debt-relief and bankruptcy attorneys in your state for a free consultation. Listings are paid advertisements; X Debt does not endorse any attorney.",
  path: "/find-an-attorney",
});

export default async function FindAttorneyPage() {
  const partners = await listActivePartners();

  return (
    <div className="bg-[#050810] font-sans text-white">
      <SolvanaNav />

      <section className="px-6 pb-8 pt-16">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mb-4 text-4xl font-bold md:text-5xl">
            Find a{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">debt or bankruptcy attorney</span>
          </h1>
          <p className="text-lg text-gray-300">
            Some debt situations need a lawyer — a lawsuit, garnishment, foreclosure, or bankruptcy. Connect with a
            vetted attorney for a free consultation.
          </p>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-4xl">
          {partners.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center text-slate-400">
              We&rsquo;re onboarding attorneys in your area now. Check back soon.
            </p>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {partners.map((p) => <AttorneyCard key={p.id} partner={p} />)}
            </div>
          )}

          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
            <p className="text-sm text-slate-400">
              Are you an attorney? <Link href="/attorneys" className="text-cyan-300 hover:text-cyan-200">Advertise your practice on X Debt →</Link>
            </p>
          </div>

          <p className="mt-6 text-center text-xs leading-relaxed text-slate-600">
            Attorney listings are paid advertisements. X Debt is not a law firm and does not provide legal advice,
            recommend, or endorse any attorney. Choosing a lawyer is an important decision; do your own due diligence.
          </p>
        </div>
      </section>

      <SolvanaFooter />
    </div>
  );
}

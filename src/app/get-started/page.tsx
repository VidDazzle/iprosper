import type { Metadata } from "next";
import { Suspense } from "react";
import SolvanaNav from "@/components/solvana/nav";
import SolvanaFooter from "@/components/solvana/footer";
import LeadForm from "@/components/solvana/lead-form";
import { JsonLd, serviceLd, pageMetadata } from "@/lib/solvana/seo";
import { ShieldCheck, Clock, BadgeDollarSign, Star } from "lucide-react";

export const metadata: Metadata = pageMetadata({
  title: "Get Started — Free Debt Relief Eligibility Check",
  description:
    "See if you qualify to settle your credit card, medical, or loan debt for less. AI-powered, no upfront fees. Free 2-minute eligibility check.",
  path: "/get-started",
});

const TRUST = [
  { icon: BadgeDollarSign, text: "No upfront fees — pay only when a debt settles" },
  { icon: ShieldCheck, text: "FDIC-insured account you own and control" },
  { icon: Clock, text: "AI agents work your file 24/7" },
  { icon: Star, text: "Radically transparent about the trade-offs" },
];

export default function GetStartedPage() {
  return (
    <div className="bg-[#050810] font-sans text-white">
      <JsonLd data={serviceLd()} />
      <SolvanaNav />

      <section className="relative overflow-hidden px-6 py-16">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute left-1/2 top-[-150px] h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[130px]" />
          <div className="absolute bottom-[-120px] right-[-80px] h-[360px] w-[360px] rounded-full bg-violet-600/20 blur-[110px]" />
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          {/* Left: pitch */}
          <div>
            <h1 className="mb-5 text-4xl font-bold leading-tight md:text-5xl">
              Settle your debt for{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">
                less than you owe
              </span>
            </h1>
            <p className="mb-8 text-lg text-gray-300">
              Solvana&apos;s AI voice agents negotiate with your creditors to accept a smaller,
              one-time lump-sum payment on credit cards, medical bills, and personal loans —
              and forgive the rest. Find out in two minutes if you qualify.
            </p>
            <ul className="space-y-3">
              {TRUST.map((t) => (
                <li key={t.text} className="flex items-center gap-3 text-gray-300">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-600/20 text-cyan-300">
                    <t.icon className="h-4 w-4" />
                  </span>
                  {t.text}
                </li>
              ))}
            </ul>
          </div>

          {/* Right: lead capture */}
          <div className="lg:pl-6">
            <div className="mb-4 text-center lg:text-left">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">
                Free eligibility check
              </p>
              <h2 className="mt-1 text-2xl font-bold">Do I qualify?</h2>
            </div>
            <Suspense fallback={null}>
              <LeadForm />
            </Suspense>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#03040a] px-6 py-8">
        <p className="mx-auto max-w-4xl text-center text-xs leading-relaxed text-gray-500">
          Solvana negotiates settlements of unsecured debt; it does not lend money or pay
          creditors directly. Enrollment requires $7,500+ in qualifying unsecured debt. Programs
          typically take 24–36 months. Fees (15–25% of enrolled debt) are charged only after a
          debt is settled. Stopping payments may hurt your credit and lead to collections or
          lawsuits; creditors are not required to accept settlements. Results vary and are not
          guaranteed. Not available in all states.
        </p>
      </section>

      <SolvanaFooter />
    </div>
  );
}

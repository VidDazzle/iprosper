import type { Metadata } from "next";
import Link from "next/link";
import SolvanaNav from "@/components/solvana/nav";
import SolvanaFooter from "@/components/solvana/footer";
import FinalCTA from "@/components/solvana/cta";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Lock } from "lucide-react";
import { PROGRAM, USD } from "@/lib/solvana/brand";
import { JsonLd, serviceLd, breadcrumbLd, pageMetadata } from "@/lib/solvana/seo";

export const metadata: Metadata = pageMetadata({
  title: "Fees — No Upfront Costs, Ever",
  description:
    "Solvana charges 15%–25% of enrolled debt, only after a debt settles, you approve the terms, and you make the first settlement payment. The federal advance-fee ban, enforced in code.",
  path: "/pricing",
});

const NEVER = [
  "Enrollment or sign-up fees",
  "Monthly maintenance or 'service' fees",
  "Consultation or analysis fees",
  "Cancellation or exit penalties",
  "Fees on debts that never settle",
];

const ONLY = [
  "A performance fee of 15%–25% of each enrolled debt",
  "Charged per debt, only after that debt settles",
  "Only after you approve the settlement terms",
  "Only after you make the first settlement payment",
  "Deducted from your dedicated account with full line-item visibility",
];

export default function FeesPage() {
  return (
    <div className="bg-[#050810] font-sans text-white">
      <JsonLd
        data={[
          serviceLd(),
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "Fees", path: "/pricing" },
          ]),
        ]}
      />
      <SolvanaNav />

      <section className="relative overflow-hidden px-6 pb-16 pt-20 text-center">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute left-1/2 top-[-150px] h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-cyan-500/15 blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-3xl">
          <h1 className="mb-6 text-5xl font-bold md:text-6xl">
            You pay{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">
              only when we deliver
            </span>
          </h1>
          <p className="text-lg text-gray-300">
            Federal law prohibits debt settlement companies from charging fees before a
            debt is actually settled. We go further: the advance-fee ban is enforced by
            our payment system itself. A fee that hasn&apos;t passed the legal gate cannot
            physically move.
          </p>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-rose-400/20 bg-rose-400/5 p-8">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-rose-300">
              <XCircle className="h-6 w-6" /> What we never charge
            </h2>
            <ul className="space-y-3 text-gray-300">
              {NEVER.map((x) => (
                <li key={x} className="flex gap-3">
                  <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-400/70" /> {x}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-cyan-400/25 bg-cyan-400/5 p-8">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-cyan-300">
              <CheckCircle2 className="h-6 w-6" /> The only fee that exists
            </h2>
            <ul className="space-y-3 text-gray-300">
              {ONLY.map((x) => (
                <li key={x} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-cyan-400/80" /> {x}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-5xl rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur md:p-10">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
            <Lock className="h-5 w-5 text-violet-300" /> Worked example
          </h2>
          <p className="mb-6 text-sm text-gray-400">
            Say you enroll {USD.format(20000)} of credit card debt and Nova settles it for{" "}
            {USD.format(9000)} (45%). At a 20% fee ({USD.format(4000)}), your total cost is{" "}
            {USD.format(13000)} — {USD.format(7000)} less than you owed, before any
            creditor-added interest and fees. If a debt never settles, its fee is never
            charged. Period.
          </p>
          <div className="grid gap-4 text-center sm:grid-cols-4">
            {[
              ["Enrolled debt", USD.format(20000)],
              ["Negotiated settlement", USD.format(9000)],
              ["Solvana fee (20%)", USD.format(4000)],
              ["You keep", USD.format(7000)],
            ].map(([label, value], i) => (
              <div
                key={label}
                className={`rounded-xl border p-4 ${i === 3 ? "border-cyan-400/40 bg-cyan-400/10" : "border-white/10 bg-[#03040a]"}`}
              >
                <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
                <p className={`mt-1 text-xl font-bold ${i === 3 ? "text-cyan-300" : "text-white"}`}>
                  {value}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-gray-500">
            Illustrative only. Typical settlements range 40–60% of enrolled balance; fees range{" "}
            {PROGRAM.feePctLow}%–{PROGRAM.feePctHigh}% depending on your state and debt profile.
            Results vary and are not guaranteed. Creditors may add interest and fees to enrolled
            balances, and forgiven debt may be taxable.
          </p>
        </div>

        <div className="mt-12 text-center">
          <Link href="/qualify">
            <Button className="h-12 rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 px-10 text-lg text-white shadow-[0_0_28px_rgba(139,92,246,0.4)] hover:from-cyan-400 hover:to-violet-500">
              See my personalized numbers
            </Button>
          </Link>
        </div>
      </section>

      <FinalCTA />
      <SolvanaFooter />
    </div>
  );
}

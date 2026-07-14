import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { PROGRAM, USD } from "@/lib/solvana/brand";

const PROS = [
  "Potentially pay back significantly less than you owe",
  "Zero upfront fees — we're paid only when a debt settles and you approve it",
  "One monthly deposit into an account you own, instead of juggling creditors",
  "AI agents work your file 24/7 — settlements don't wait for business hours",
  "Exit anytime and take every dollar in your dedicated account with you",
];

const CONS = [
  "Stopping payments can severely damage your credit score",
  "Creditors may keep charging interest and late fees during negotiation",
  "Creditors can continue collection efforts, including lawsuits",
  "Creditors are not legally required to accept any settlement",
  "Forgiven debt over $600 may be taxed as income",
];

export default function Transparency() {
  return (
    <section className="bg-[#03040a] px-6 py-24 text-white">
      <div className="mx-auto max-w-6xl">
        <p className="mb-3 text-center text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">
          Radical transparency
        </p>
        <h2 className="mb-4 text-center text-4xl font-bold md:text-5xl">
          Debt settlement has trade-offs.{" "}
          <span className="bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">
            Here are all of them.
          </span>
        </h2>
        <p className="mx-auto mb-14 max-w-2xl text-center text-gray-400">
          Our agents are required — by their own guardrails — to tell you every one of
          these before you enroll. So we put them on the homepage.
        </p>

        <div className="mb-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-8">
            <h3 className="mb-5 flex items-center gap-2 text-xl font-semibold text-emerald-300">
              <CheckCircle2 className="h-5 w-5" /> The upside
            </h3>
            <ul className="space-y-3 text-sm text-gray-300">
              {PROS.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-8">
            <h3 className="mb-5 flex items-center gap-2 text-xl font-semibold text-amber-300">
              <AlertTriangle className="h-5 w-5" /> The honest downside
            </h3>
            <ul className="space-y-3 text-sm text-gray-300">
              {CONS.map((c) => (
                <li key={c} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <h3 className="mb-3 text-lg font-semibold">Fees</h3>
            <p className="text-3xl font-bold text-cyan-300">
              {PROGRAM.feePctLow}–{PROGRAM.feePctHigh}%
            </p>
            <p className="mt-2 text-sm text-gray-400">
              of enrolled debt, charged per debt only after it settles, you approve the terms,
              and you make the first settlement payment. Never before. That&apos;s federal law —
              and it&apos;s enforced in our code.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <h3 className="mb-3 text-lg font-semibold">To enroll, you need</h3>
            <p className="text-3xl font-bold text-cyan-300">{USD.format(PROGRAM.minDebt)}+</p>
            <p className="mt-2 text-sm text-gray-400">
              in qualifying unsecured debt (most clients enroll with{" "}
              {USD.format(PROGRAM.typicalMinDebt)} or more), a genuine financial hardship, and
              the ability to make a monthly program deposit.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <XCircle className="h-5 w-5 text-rose-400" /> What we can&apos;t settle
            </h3>
            <ul className="mt-2 space-y-1.5 text-sm text-gray-400">
              {PROGRAM.ineligibleDebts.map((d) => (
                <li key={d}>• {d}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

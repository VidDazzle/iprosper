import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wallet, GraduationCap, Home, CreditCard, Car, Stethoscope, ArrowRight } from "lucide-react";

const DEBT_TYPES = [
  { icon: CreditCard, label: "Credit cards" },
  { icon: Home, label: "Mortgages & HELOCs" },
  { icon: Car, label: "Auto loans" },
  { icon: GraduationCap, label: "Student loans" },
  { icon: Stethoscope, label: "Medical bills" },
  { icon: Wallet, label: "Lines of credit" },
];

export default function FreeAdvisor() {
  return (
    <section className="relative overflow-hidden bg-[#03040a] px-6 py-24 text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute left-[-120px] top-1/2 h-[360px] w-[360px] -translate-y-1/2 rounded-full bg-emerald-500/10 blur-[110px]" />
      </div>
      <div className="relative mx-auto max-w-6xl">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1.5 text-sm text-emerald-300">
              Always free
            </span>
            <h2 className="mb-4 text-4xl font-bold md:text-5xl">
              A free plan to erase{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">every kind of debt</span>
            </h2>
            <p className="mb-6 text-lg text-gray-300">
              Add what you owe, set your budget, and X Debt builds a personalized payoff plan —
              which debt to attack first, exactly when you&rsquo;ll be debt-free, and how much
              interest you&rsquo;ll save. Plus the debt-reduction tactics most people never learn:
              mortgage recasting, APR-reduction scripts, medical-bill audits, IDR and PSLF, and more.
            </p>
            <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {DEBT_TYPES.map((d) => (
                <span key={d.label} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-gray-300">
                  <d.icon className="h-4 w-4 text-cyan-300" /> {d.label}
                </span>
              ))}
            </div>
            <Link href="/advisor">
              <Button className="h-12 rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 px-8 text-lg text-white shadow-[0_0_28px_rgba(139,92,246,0.4)] hover:from-cyan-400 hover:to-violet-500">
                Build my free plan <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            <p className="mt-3 text-xs text-gray-500">No signup. No credit check. Your numbers never leave your device.</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
            <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Strategies most people don&rsquo;t know</p>
            <ul className="space-y-4">
              {[
                ["Recast your mortgage", "Drop your payment permanently after a lump sum — no refinance, no closing costs."],
                ["Lower your card APR in one call", "Roughly half who ask get a cut. Costs nothing."],
                ["Audit your medical bill", "High error rates; charity-care programs can erase balances."],
                ["Income-Driven Repayment & PSLF", "Federal student-loan payments as low as $0, with forgiveness."],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-1 text-amber-300">★</span>
                  <span><span className="font-semibold text-white">{t}.</span> <span className="text-sm text-gray-400">{d}</span></span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

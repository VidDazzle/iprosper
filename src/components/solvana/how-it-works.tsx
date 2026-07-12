import { PiggyBank, Handshake, BadgeCheck } from "lucide-react";
import { PROGRAM } from "@/lib/solvana/brand";

const STEPS = [
  {
    icon: PiggyBank,
    step: "01",
    title: "Stop payments. Start saving.",
    body: `You stop paying enrolled creditors directly and instead make one monthly deposit into a dedicated, FDIC-insured savings account. The account is yours — you own it, you control it, and you can withdraw your money at any time without penalty.`,
    agent: "Ledger manages your account and deposit schedule",
  },
  {
    icon: Handshake,
    step: "02",
    title: "AI negotiates your debts down.",
    body: `As your balance grows, our negotiation agent contacts your creditors and negotiates a smaller, one-time lump-sum payoff — timed to each creditor's settlement patterns. Every offer is presented to you for approval before a dollar moves.`,
    agent: "Nova negotiates; Atlas builds the strategy",
  },
  {
    icon: BadgeCheck,
    step: "03",
    title: "Settle and move on.",
    body: `When a creditor accepts and you approve, funds go from your account to the creditor and the rest of that debt is forgiven — confirmed in writing. Our fee applies only to debts that actually settle. Most clients finish in ${PROGRAM.termLowMonths}–${PROGRAM.termHighMonths} months.`,
    agent: "Sentinel verifies every settlement letter",
  },
];

export default function HowItWorks() {
  return (
    <section className="relative bg-[#050810] px-6 py-24 text-white">
      <div className="mx-auto max-w-6xl">
        <p className="mb-3 text-center text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">
          How the program works
        </p>
        <h2 className="mb-14 text-center text-4xl font-bold md:text-5xl">
          Three steps. One dedicated account.{" "}
          <span className="bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">
            You stay in control.
          </span>
        </h2>

        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <div
              key={s.step}
              className="group relative rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur transition-colors hover:border-cyan-400/40"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-600/20 text-cyan-300">
                  <s.icon className="h-6 w-6" />
                </span>
                <span className="text-4xl font-bold text-white/10 transition-colors group-hover:text-cyan-400/30">
                  {s.step}
                </span>
              </div>
              <h3 className="mb-3 text-xl font-semibold">{s.title}</h3>
              <p className="mb-5 text-sm leading-relaxed text-gray-400">{s.body}</p>
              <p className="text-xs font-medium text-violet-300">⚡ {s.agent}</p>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-3xl text-center text-xs leading-relaxed text-gray-500">
          Important: stopping payments to creditors will likely hurt your credit score, and
          creditors may continue charging interest and late fees, or pursue collection —
          including lawsuits — while we negotiate. Creditors are not legally required to accept
          a settlement. We tell you this up front because it&apos;s true.
        </p>
      </div>
    </section>
  );
}

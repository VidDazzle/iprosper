import { RefreshCw, Brain, Gauge } from "lucide-react";

const PILLARS = [
  {
    icon: RefreshCw,
    title: "Self-healing",
    body:
      "Every account is reconciled continuously. If a deposit slips, a settlement letter doesn't match, or a creditor changes hands, the platform detects the break, corrects course, and escalates to the right agent — or a licensed human — before it becomes your problem.",
  },
  {
    icon: Brain,
    title: "Self-learning",
    body:
      "Every negotiation outcome, creditor response, and payoff result feeds back into the models. X Debt learns which strategies land with which creditors, when to make offers, and which payoff paths actually get people debt-free — and gets sharper with every case.",
  },
  {
    icon: Gauge,
    title: "Self-optimizing",
    body:
      "Your plan isn't static. As your income, balances, rates, and creditor behavior change, the platform re-runs the math and re-sequences your payoff and negotiation strategy automatically — always steering toward the fastest, cheapest path out of debt.",
  },
];

export default function SelfOptimizing() {
  return (
    <section className="bg-[#050810] px-6 py-24 text-white">
      <div className="mx-auto max-w-6xl">
        <p className="mb-3 text-center text-sm font-semibold uppercase tracking-[0.2em] text-violet-400">
          A living system
        </p>
        <h2 className="mb-4 text-center text-4xl font-bold md:text-5xl">
          The whole platform is{" "}
          <span className="bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">
            self-healing, self-learning, self-optimizing
          </span>
        </h2>
        <p className="mx-auto mb-14 max-w-2xl text-center text-gray-400">
          X Debt isn&rsquo;t a form you fill out once. It&rsquo;s an autonomous system that watches
          your debts, learns from every outcome, and continuously tunes your path to debt-free.
        </p>

        <div className="grid gap-5 md:grid-cols-3">
          {PILLARS.map((p) => (
            <div key={p.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur transition-colors hover:border-violet-400/40">
              <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-600/20 text-cyan-300">
                <p.icon className="h-6 w-6" />
              </span>
              <h3 className="mb-2 text-xl font-semibold">{p.title}</h3>
              <p className="text-sm leading-relaxed text-gray-400">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

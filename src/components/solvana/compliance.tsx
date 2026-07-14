import Link from "next/link";
import { Scale, Lock, Landmark, FileCheck2, PhoneOff, Gavel } from "lucide-react";

const PILLARS = [
  {
    icon: Scale,
    title: "FTC Telemarketing Sales Rule",
    body: "The federal advance-fee ban (16 C.F.R. § 310.4(a)(5)) is enforced as code in our payment system: no fee can physically move until a debt is settled, you approve the terms, and you make the first settlement payment.",
  },
  {
    icon: Landmark,
    title: "Your money, your account",
    body: "Program deposits sit in a dedicated FDIC-insured account at an independent partner bank. You own it, you control it, and you can withdraw everything at any time without penalty. X Debt never holds your funds.",
  },
  {
    icon: FileCheck2,
    title: "Every disclosure, every time",
    body: "Sentinel, our compliance agent, verifies that all eight legally required disclosures were delivered and acknowledged on a recorded line before any enrollment agreement can be signed.",
  },
  {
    icon: PhoneOff,
    title: "TCPA & call consent",
    body: "AI agents call only with your consent, only 8 AM–9 PM your local time, announce they're AI, obtain recording consent per your state's law, and honor do-not-call requests instantly and permanently.",
  },
  {
    icon: Lock,
    title: "GLBA-grade data security",
    body: "Your financial data is encrypted in transit and at rest, access-logged per agent, and never sold. Our AI agents access only the minimum data their specialty requires.",
  },
  {
    icon: Gavel,
    title: "Humans where the law requires",
    body: "X Debt is not a law firm. If a creditor sues, our Guardian agent connects you with an independent licensed consumer attorney within 24 hours — and novel legal questions always go to supervising counsel, not an algorithm.",
  },
];

export default function ComplianceSection() {
  return (
    <section className="bg-[#050810] px-6 py-24 text-white">
      <div className="mx-auto max-w-6xl">
        <p className="mb-3 text-center text-sm font-semibold uppercase tracking-[0.2em] text-violet-400">
          The legal framework
        </p>
        <h2 className="mb-4 text-center text-4xl font-bold md:text-5xl">
          AI-run.{" "}
          <span className="bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">
            Regulation-first.
          </span>
        </h2>
        <p className="mx-auto mb-14 max-w-2xl text-center text-gray-400">
          Autonomy without guardrails is a liability. Every X Debt agent operates inside a
          compliance layer with veto power over every call, letter, and fee event.
        </p>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur transition-colors hover:border-violet-400/40"
            >
              <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 text-violet-300">
                <p.icon className="h-5 w-5" />
              </span>
              <h3 className="mb-2 text-lg font-semibold">{p.title}</h3>
              <p className="text-sm leading-relaxed text-gray-400">{p.body}</p>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-gray-500">
          Read the full{" "}
          <Link href="/legal/disclosures" className="text-cyan-300 underline hover:text-cyan-200">
            program disclosures
          </Link>{" "}
          and{" "}
          <Link href="/legal/licensing" className="text-cyan-300 underline hover:text-cyan-200">
            state licensing details
          </Link>
          .
        </p>
      </div>
    </section>
  );
}

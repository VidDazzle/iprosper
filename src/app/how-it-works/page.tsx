import type { Metadata } from "next";
import SolvanaNav from "@/components/solvana/nav";
import SolvanaFooter from "@/components/solvana/footer";
import HowItWorks from "@/components/solvana/how-it-works";
import Transparency from "@/components/solvana/transparency";
import ComplianceSection from "@/components/solvana/compliance";
import FAQ from "@/components/solvana/faq";
import FinalCTA from "@/components/solvana/cta";
import { FAQS } from "@/components/solvana/faq";
import { JsonLd, faqLd, serviceLd, breadcrumbLd, pageMetadata } from "@/lib/solvana/seo";
import { PROGRAM } from "@/lib/solvana/brand";

export const metadata: Metadata = pageMetadata({
  title: "How Debt Settlement Works",
  description:
    "Stop payments, save into an FDIC-insured account you control, and let Solvana's AI agents negotiate lump-sum settlements with your creditors. Typical programs run 24–36 months.",
  path: "/how-it-works",
});

const TIMELINE = [
  { month: "Day 1", event: "Free eligibility call with Aria; every required disclosure delivered on a recorded line before you sign anything." },
  { month: "Week 1", event: "Atlas builds your debt dossier; Ledger opens your dedicated FDIC-insured account; your monthly deposit begins." },
  { month: "Months 4–6", event: "First settlements typically land as your balance builds — Nova targets your riskiest and most settlement-ready creditors first." },
  { month: "Months 6–24", event: "Settlement flywheel: save, negotiate, approve, settle, repeat. Sage reviews progress with you monthly." },
  { month: `Months ${PROGRAM.termLowMonths}–${PROGRAM.termHighMonths}`, event: "Final debts settle. You graduate with written confirmation for every resolved account and a credit-rebuilding plan." },
];

export default function HowItWorksPage() {
  return (
    <div className="bg-[#050810] font-sans text-white">
      <JsonLd
        data={[
          serviceLd(),
          faqLd(FAQS),
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "How it works", path: "/how-it-works" },
          ]),
        ]}
      />
      <SolvanaNav />

      <section className="relative overflow-hidden px-6 pb-8 pt-20 text-center">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute left-1/2 top-[-150px] h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-cyan-500/15 blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-3xl">
          <h1 className="mb-6 text-5xl font-bold md:text-6xl">
            How the{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">
              program works
            </span>
          </h1>
          <p className="text-lg text-gray-300">
            We don&apos;t lend you money and we don&apos;t pay your debts. We negotiate with your
            creditors to accept a smaller, one-time lump-sum payment — and forgive the rest.
          </p>
        </div>
      </section>

      <HowItWorks />

      <section className="bg-[#03040a] px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-12 text-center text-4xl font-bold">A typical timeline</h2>
          <ol className="relative space-y-8 border-l border-white/15 pl-8">
            {TIMELINE.map((t) => (
              <li key={t.month} className="relative">
                <span className="absolute -left-[41px] flex h-5 w-5 items-center justify-center rounded-full border border-cyan-400/50 bg-[#050810]">
                  <span className="h-2 w-2 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500" />
                </span>
                <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">{t.month}</p>
                <p className="mt-1 text-gray-300">{t.event}</p>
              </li>
            ))}
          </ol>
          <p className="mt-10 text-xs leading-relaxed text-gray-500">
            Timelines are typical, not guaranteed, and depend on your deposit amount, creditor
            mix, and creditor willingness to settle. You will not make payments to enrolled
            creditors during the program, which will likely damage your credit and may lead to
            continued interest, fees, collection activity, or lawsuits.
          </p>
        </div>
      </section>

      <Transparency />
      <ComplianceSection />
      <FAQ />
      <FinalCTA />
      <SolvanaFooter />
    </div>
  );
}

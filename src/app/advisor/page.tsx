import type { Metadata } from "next";
import SolvanaNav from "@/components/solvana/nav";
import SolvanaFooter from "@/components/solvana/footer";
import AdvisorTool from "@/components/advisor/advisor-tool";
import { JsonLd, pageMetadata } from "@/lib/solvana/seo";

export const metadata: Metadata = pageMetadata({
  title: "Free Debt Reduction Advisor — Every Debt, One Plan",
  description:
    "Build a free, private payoff plan for every kind of debt — mortgages, credit cards, auto, student, medical, HELOCs, and more. Get strategies most people never hear about and see exactly how fast you can be debt-free.",
  path: "/advisor",
});

export default function AdvisorPage() {
  return (
    <div className="bg-[#050810] font-sans text-white">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "X Debt — Free Debt Reduction Advisor",
          applicationCategory: "FinanceApplication",
          operatingSystem: "Web",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          description:
            "A free tool that builds a personalized debt payoff plan across all debt types and teaches lesser-known debt-reduction strategies.",
        }}
      />
      <SolvanaNav />

      <section className="relative overflow-hidden px-6 pb-10 pt-16">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute left-1/2 top-[-160px] h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-cyan-500/15 blur-[130px]" />
        </div>
        <div className="relative mx-auto max-w-3xl text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1.5 text-sm text-emerald-300">
            100% free · no signup · nothing leaves your browser
          </span>
          <h1 className="mb-5 text-4xl font-bold md:text-6xl">
            Every debt has an exit.{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">Find yours.</span>
          </h1>
          <p className="text-lg text-gray-300">
            Add what you owe — mortgages, credit cards, auto and student loans, medical bills, HELOCs, lines of credit —
            set your budget, and get a personalized payoff plan plus the debt-reduction strategies most people never learn.
          </p>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-4xl">
          <AdvisorTool />
        </div>
      </section>

      <SolvanaFooter />
    </div>
  );
}

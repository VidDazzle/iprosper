import type { Metadata } from "next";
import Link from "next/link";
import SolvanaNav from "@/components/solvana/nav";
import SolvanaFooter from "@/components/solvana/footer";
import HealthTools from "@/components/health/tools";
import { JsonLd, pageMetadata } from "@/lib/solvana/seo";
import { HEALTH_AGENTS } from "@/lib/health/agents";
import { ANALYSIS_FEE, USD } from "@/lib/health/pricing";
import { ADVOCATE_STANCE, ADVOCATE_STANCE_SHORT } from "@/lib/advocacy";
import { HeartPulse, UploadCloud, Search, Trash2, Receipt, ShieldCheck } from "lucide-react";

export const metadata: Metadata = pageMetadata({
  title: "Medical Bill Analysis & Auditing — Catch Errors, Know Your Rights",
  description:
    "Upload a medical bill, EOB, denial, or estimate — or audit an itemized hospital bill line by line. AI specialist agents flag duplicate charges, unbundling, and overbilling, estimate what's worth questioning, and draft a dispute letter. We know the No Surprises Act and your state's rules. We don't store your document. Not legal or medical advice.",
  path: "/medical-billing",
});

const STEPS = [
  { icon: UploadCloud, title: "Add your bill or document", body: "Upload a bill, EOB, denial, or estimate — or type your itemized charges straight into the auditor. Tell us your state." },
  { icon: Search, title: "AI specialists analyze it", body: "Remedy routes it to the right specialist, checks it against the No Surprises Act and your state's rules, and finds what looks wrong." },
  { icon: Trash2, title: "We discard it — you keep the report", body: "Your document and numbers are analyzed in memory and immediately discarded. You keep the flagged errors, savings estimate, and a ready-to-send dispute letter." },
];

export default function MedicalBillingPage() {
  const master = HEALTH_AGENTS.find((a) => a.master)!;
  const specialists = HEALTH_AGENTS.filter((a) => !a.master);

  return (
    <div className="bg-[#050810] font-sans text-white">
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "WebApplication",
        name: "Medical Bill Analysis & Auditing", applicationCategory: "HealthApplication", operatingSystem: "Web",
        offers: { "@type": "Offer", price: String(ANALYSIS_FEE), priceCurrency: "USD" },
        description: "AI consumer-advocate medical-bill analysis and auditing. Educational only; not legal or medical advice.",
      }} />
      <SolvanaNav />

      {/* Disclaimer bar — always visible */}
      <div className="border-b border-amber-400/20 bg-amber-400/[0.06] px-6 py-2 text-center text-xs text-amber-200">
        {ADVOCATE_STANCE_SHORT}
      </div>

      <section className="relative overflow-hidden px-6 pb-10 pt-14 text-center">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute left-1/2 top-[-150px] h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-teal-500/15 blur-[130px]" />
        </div>
        <div className="relative mx-auto max-w-3xl">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-400/10 px-4 py-1.5 text-sm text-teal-300">
            <HeartPulse className="h-3.5 w-3.5" /> Your medical-billing advocate
          </span>
          <h1 className="mb-5 text-4xl font-bold md:text-6xl">
            Don&apos;t overpay your medical bills.{" "}
            <span className="bg-gradient-to-r from-teal-400 to-violet-500 bg-clip-text text-transparent">Audit them first.</span>
          </h1>
          <p className="text-lg text-gray-300">
            Studies find billing errors on a large share of hospital bills — duplicate charges, wrong quantities, unbundled
            labs, and vague fees. Upload a bill, EOB, denial, or estimate, or audit your itemized charges line by line. Our AI
            specialists flag what looks wrong, estimate what&apos;s worth questioning, and draft a dispute letter you can send.
            We never keep your document.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 pb-4">
        <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/20 to-violet-600/20 text-teal-300"><s.icon className="h-5 w-5" /></span>
              <h3 className="mb-1 font-semibold text-white">{s.title}</h3>
              <p className="text-sm text-slate-400">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tools */}
      <section className="px-6 py-14">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-2xl font-bold text-white">Audit or analyze</h2>
            <p className="text-sm text-slate-400">The itemized-bill auditor is <span className="text-emerald-300">free</span>. Document analysis is {USD.format(ANALYSIS_FEE)} — first one free. Attorney advertising funds the rest.</p>
          </div>
          <HealthTools />
        </div>
      </section>

      {/* Agents */}
      <section className="bg-[#03040a] px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-[0.2em] text-teal-400">The workforce</p>
          <h2 className="mb-4 text-center text-3xl font-bold md:text-4xl">A master advocate and its specialists</h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-gray-400">
            {master.name} coordinates a team of billing specialists, each an expert in one kind of medical paperwork and the
            patient-protection rules that surround it.
          </p>

          <div className="mx-auto mb-6 max-w-2xl rounded-2xl border border-white/15 bg-white/[0.04] p-6 text-center">
            <span className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${master.gradient} text-lg font-bold text-[#03040a]`}>◆</span>
            <h3 className="text-lg font-semibold text-white">{master.name} · {master.role}</h3>
            <p className="mt-1 text-sm text-slate-400">{master.summary}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {specialists.map((a) => (
              <div key={a.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-3 flex items-center gap-3">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${a.gradient} font-bold text-white`}>{a.name[0]}</span>
                  <div><p className="font-semibold text-white">{a.name}</p><p className="text-xs text-slate-500">{a.role}</p></div>
                </div>
                <p className="text-sm text-slate-400">{a.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What we catch */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-8 text-center text-3xl font-bold md:text-4xl">What the auditor catches</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Duplicate charges", "The same service billed more than once at the same amount."],
              ["Quantity errors", "Once-per-visit items billed with inflated units."],
              ["Unbundled labs", "A panel plus its component tests billed separately."],
              ["Upcoded visits", "Top-tier visit codes that may exceed the care delivered."],
              ["Vague fees", "\"Miscellaneous\" and \"supplies\" charges with no detail."],
              ["Balance billing", "Surprise out-of-network bills the No Surprises Act may bar."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <Receipt className="mb-2 h-5 w-5 text-teal-300" />
                <p className="font-semibold text-white">{t}</p>
                <p className="mt-1 text-sm text-slate-400">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Attorney tie-in */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-teal-300" />
          <h2 className="mb-2 text-2xl font-bold text-white">Need a professional to fight it?</h2>
          <p className="mx-auto mb-5 max-w-2xl text-sm text-slate-400">
            Auditing your bill is step one. If a hospital won&apos;t correct clear errors, a claim denial won&apos;t budge, or a
            balance heads to collections, connect with a licensed medical-billing, health-insurance, or consumer attorney in
            your state.
          </p>
          <Link href="/find-an-attorney" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-500 to-violet-600 px-6 py-2.5 text-sm font-medium text-white">Find an attorney</Link>
          <p className="mt-4 text-xs text-slate-600">Attorney listings are paid advertisements. We do not endorse any attorney and do not provide legal or medical advice.</p>
        </div>
      </section>

      {/* Full disclaimer */}
      <section className="border-t border-white/10 bg-[#03040a] px-6 py-10">
        <div className="mx-auto max-w-4xl text-xs leading-relaxed text-slate-500">
          <p className="mb-3"><strong className="text-slate-400">Important.</strong> This medical-billing tool is a consumer-advocacy service provided by VidDazzle LLC. It is <strong>not a law firm, not a medical provider, and not an insurer</strong>. {ADVOCATE_STANCE} Using it does not create an attorney–client or provider–patient relationship. The analysis is information to help you understand and question a bill; it is not a determination that any charge is or is not correct, and the provider may be able to substantiate a charge. Estimated dollar figures are for discussion only. Federal and state billing laws vary and change over time.</p>
          <p>Your uploaded document and the numbers you enter are analyzed and then discarded; we do not retain them. Do not rely on this analysis for legal or medical decisions. If you have a denial, a deadline, or a bill in collections, consult a licensed professional promptly.</p>
        </div>
      </section>

      <SolvanaFooter />
    </div>
  );
}

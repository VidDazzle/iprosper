import type { Metadata } from "next";
import Link from "next/link";
import SolvanaNav from "@/components/solvana/nav";
import SolvanaFooter from "@/components/solvana/footer";
import LawArmorTools from "@/components/lawarmor/tools";
import { JsonLd, pageMetadata } from "@/lib/solvana/seo";
import { LAWARMOR_AGENTS } from "@/lib/lawarmor/agents";
import { ANALYSIS_FEE, USD } from "@/lib/lawarmor/pricing";
import { ShieldCheck, UploadCloud, Trash2, FileText, Scale } from "lucide-react";

export const metadata: Metadata = pageMetadata({
  title: "Law & Armor — Understand Any Document, Know Your Rights",
  description:
    "Upload an insurance policy, real estate contract, lease, or any agreement. AI specialist agents explain it in plain English, flag red flags, and point out your consumer rights by state. We don't store your document. Not legal advice.",
  path: "/law-and-armor",
});

const STEPS = [
  { icon: UploadCloud, title: "Upload your document", body: "An insurance policy, real estate or auto document, a lease, or any contract. Tell us your state." },
  { icon: ShieldCheck, title: "AI specialists analyze it", body: "Aegis routes it to the right specialist, consults the state-law engine, and builds a plain-English report." },
  { icon: Trash2, title: "We discard it — you keep the insight", body: "Your document is analyzed in memory and immediately discarded. We never store it. You get key points, watch-outs, and your rights." },
];

export default function LawArmorPage() {
  const master = LAWARMOR_AGENTS.find((a) => a.master)!;
  const specialists = LAWARMOR_AGENTS.filter((a) => !a.master);

  return (
    <div className="bg-[#050810] font-sans text-white">
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "WebApplication",
        name: "Law & Armor — Document Analysis", applicationCategory: "BusinessApplication", operatingSystem: "Web",
        offers: { "@type": "Offer", price: String(ANALYSIS_FEE), priceCurrency: "USD" },
        description: "AI consumer-advocate document analysis. Educational only; not legal advice.",
      }} />
      <SolvanaNav />

      {/* Disclaimer bar — always visible */}
      <div className="border-b border-amber-400/20 bg-amber-400/[0.06] px-6 py-2 text-center text-xs text-amber-200">
        Law &amp; Armor is a consumer-education tool. We are not attorneys and this is <strong>not legal advice</strong>.
      </div>

      <section className="relative overflow-hidden px-6 pb-10 pt-14 text-center">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute left-1/2 top-[-150px] h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-cyan-500/15 blur-[130px]" />
        </div>
        <div className="relative mx-auto max-w-3xl">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1.5 text-sm text-cyan-300">
            <Scale className="h-3.5 w-3.5" /> Your consumer advocate
          </span>
          <h1 className="mb-5 text-4xl font-bold md:text-6xl">
            Understand any document.{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">Know your rights.</span>
          </h1>
          <p className="text-lg text-gray-300">
            Insurance policies, real estate and auto documents, leases, warranties, and any contract — uploaded, analyzed
            by AI specialists who know the rules in your state, and explained in plain English. We point out what matters
            and what rights you may have. We never keep your document.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 pb-4">
        <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-600/20 text-cyan-300"><s.icon className="h-5 w-5" /></span>
              <h3 className="mb-1 font-semibold text-white">{s.title}</h3>
              <p className="text-sm text-slate-400">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Analyzer */}
      <section className="px-6 py-14">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-2xl font-bold text-white">Analyze or compare</h2>
            <p className="text-sm text-slate-400">{USD.format(ANALYSIS_FEE)} per document — first one free. We keep the price at cost; attorney advertising funds the rest.</p>
          </div>
          <LawArmorTools />
        </div>
      </section>

      {/* Agents */}
      <section className="bg-[#03040a] px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">The workforce</p>
          <h2 className="mb-4 text-center text-3xl font-bold md:text-4xl">A master orchestrator and its specialists</h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-gray-400">
            {master.name} coordinates a team of document specialists, each an expert in one kind of paperwork and the
            consumer-protection rules that surround it.
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

      {/* Attorney tie-in */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <FileText className="mx-auto mb-3 h-8 w-8 text-cyan-300" />
          <h2 className="mb-2 text-2xl font-bold text-white">Need a professional review?</h2>
          <p className="mx-auto mb-5 max-w-2xl text-sm text-slate-400">
            Understanding your document is step one. If your situation needs real legal help, connect with a licensed
            insurance, real-estate, or contract attorney in your state for a consultation.
          </p>
          <Link href="/find-an-attorney" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 px-6 py-2.5 text-sm font-medium text-white">Find an attorney</Link>
          <p className="mt-4 text-xs text-slate-600">Attorney listings are paid advertisements. Law &amp; Armor does not endorse any attorney and does not provide legal advice.</p>
        </div>
      </section>

      {/* Full disclaimer */}
      <section className="border-t border-white/10 bg-[#03040a] px-6 py-10">
        <div className="mx-auto max-w-4xl text-xs leading-relaxed text-slate-500">
          <p className="mb-3"><strong className="text-slate-400">Important.</strong> Law &amp; Armor is an educational consumer-advocacy tool provided by VidDazzle LLC. It is <strong>not a law firm</strong>, does <strong>not provide legal advice</strong>, and using it does not create an attorney–client relationship. The analysis is general information to help you understand a document and is not a substitute for advice from a licensed attorney about your specific situation. Laws vary by state and change over time.</p>
          <p>Your uploaded document is analyzed and then discarded; we do not retain the file. Do not rely on this analysis for legal decisions. If you have a dispute or deadline, consult a licensed attorney promptly.</p>
        </div>
      </section>

      <SolvanaFooter />
    </div>
  );
}

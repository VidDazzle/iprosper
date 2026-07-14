import type { Metadata } from "next";
import Link from "next/link";
import SolvanaNav from "@/components/solvana/nav";
import SolvanaFooter from "@/components/solvana/footer";
import { pageMetadata } from "@/lib/solvana/seo";
import { AGREEMENT_TITLE, AGREEMENT_VERSION, AGREEMENT_PARAGRAPHS, REQUIRED_ACKS } from "@/lib/consent/agreement";

export const metadata: Metadata = pageMetadata({
  title: "Consumer-Advocate Disclosure, Acknowledgment & Release",
  description:
    "The disclosure and hold-harmless agreement every consumer signs before using our analysis tools: we analyze and provide intelligence only, we do not give legal advice, acting on the information is at your own risk, and you may need to consult an attorney first.",
  path: "/legal/advocate-disclosure",
});

export default function AdvocateDisclosurePage() {
  return (
    <div className="bg-[#050810] font-sans text-white">
      <SolvanaNav />
      <section className="mx-auto max-w-3xl px-6 py-16">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">Legal</p>
        <h1 className="mb-2 text-3xl font-bold md:text-4xl">{AGREEMENT_TITLE}</h1>
        <p className="mb-8 text-sm text-slate-500">Version {AGREEMENT_VERSION} · You accept this before using any analysis tool or checking out.</p>

        <div className="space-y-4 text-sm leading-relaxed text-slate-300">
          {AGREEMENT_PARAGRAPHS.map((p, i) => <p key={i}>{p}</p>)}
        </div>

        <h2 className="mb-3 mt-10 text-lg font-semibold text-white">What you acknowledge when you sign</h2>
        <ul className="space-y-3">
          {REQUIRED_ACKS.map((a) => (
            <li key={a.id} className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs text-cyan-300">✓</span>
              {a.label}
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-wrap gap-4 text-sm">
          <Link href="/medical-billing" className="text-cyan-300 hover:text-cyan-200">→ Medical bill analysis</Link>
          <Link href="/law-and-armor" className="text-cyan-300 hover:text-cyan-200">→ Law &amp; Armor document analysis</Link>
          <Link href="/find-an-attorney" className="text-cyan-300 hover:text-cyan-200">→ Find an attorney</Link>
        </div>
      </section>
      <SolvanaFooter />
    </div>
  );
}

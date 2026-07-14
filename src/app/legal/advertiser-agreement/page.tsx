import type { Metadata } from "next";
import Link from "next/link";
import SolvanaNav from "@/components/solvana/nav";
import SolvanaFooter from "@/components/solvana/footer";
import { pageMetadata } from "@/lib/solvana/seo";
import {
  ADVERTISER_AGREEMENT_TITLE,
  ADVERTISER_AGREEMENT_VERSION,
  ADVERTISER_AGREEMENT_PARAGRAPHS,
  ADVERTISER_ACKS,
} from "@/lib/partners/advertiser-agreement";

export const metadata: Metadata = pageMetadata({
  title: "Advertiser Agreement & Background-Check Consent",
  description:
    "The agreement every attorney or company accepts before advertising on a VidDazzle LLC site: consent to a professional business background check, and acknowledgment that VidDazzle LLC approves, denies, and removes advertising at its sole discretion.",
  path: "/legal/advertiser-agreement",
});

export default function AdvertiserAgreementPage() {
  return (
    <div className="bg-[#050810] font-sans text-white">
      <SolvanaNav />
      <section className="mx-auto max-w-3xl px-6 py-16">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">Legal</p>
        <h1 className="mb-2 text-3xl font-bold md:text-4xl">{ADVERTISER_AGREEMENT_TITLE}</h1>
        <p className="mb-8 text-sm text-slate-500">Version {ADVERTISER_AGREEMENT_VERSION} · Accepted when you apply to advertise.</p>

        <div className="space-y-4 text-sm leading-relaxed text-slate-300">
          {ADVERTISER_AGREEMENT_PARAGRAPHS.map((p, i) => <p key={i}>{p}</p>)}
        </div>

        <h2 className="mb-3 mt-10 text-lg font-semibold text-white">What you acknowledge when you apply</h2>
        <ul className="space-y-3">
          {ADVERTISER_ACKS.map((a) => (
            <li key={a.id} className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs text-cyan-300">✓</span>
              {a.label}
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-wrap gap-4 text-sm">
          <Link href="/attorneys" className="text-cyan-300 hover:text-cyan-200">→ Advertise with us</Link>
          <Link href="/find-an-attorney" className="text-cyan-300 hover:text-cyan-200">→ Attorney directory</Link>
        </div>
      </section>
      <SolvanaFooter />
    </div>
  );
}

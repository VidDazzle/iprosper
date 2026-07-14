import Link from "next/link";
import SolvanaNav from "@/components/solvana/nav";
import SolvanaFooter from "@/components/solvana/footer";
import { PROGRAM } from "@/lib/solvana/brand";
import type { StateFacts, Faq } from "@/lib/geo/content";
import { Scale, ShieldCheck, Stethoscope, PiggyBank, Gavel, MapPin, ChevronRight, Sparkles } from "lucide-react";

const SERVICES = [
  { icon: PiggyBank, title: "Free debt-payoff plan", href: "/advisor", body: "A personalized plan for every kind of debt — free, in minutes." },
  { icon: Sparkles, title: "AI debt settlement", href: "/how-it-works", body: `AI agents negotiate qualifying unsecured debt down to a lump sum. No upfront fees; ${PROGRAM.feePctLow}–${PROGRAM.feePctHigh}% only after a debt settles.` },
  { icon: Stethoscope, title: "Medical bill audit", href: "/medical-billing", body: "We audit itemized hospital bills for errors and draft a dispute letter. Free." },
  { icon: ShieldCheck, title: "Law & Armor", href: "/law-and-armor", body: "Understand any insurance policy, lease, or contract and your rights." },
  { icon: Gavel, title: "Find an attorney", href: "/find-an-attorney", body: "Connect with a licensed attorney who advertises in your area." },
];

export interface LocationViewProps {
  heading: string;
  place: string;
  stateName: string;
  intro: string;
  facts: StateFacts;
  faqs: Faq[];
  crumbs: { name: string; path: string }[];
  childLabel?: string;
  childLinks?: { label: string; href: string; sub?: string }[];
  relatedLabel?: string;
  relatedLinks?: { label: string; href: string }[];
}

export default function LocationView(props: LocationViewProps) {
  return (
    <div className="bg-[#050810] font-sans text-white">
      <SolvanaNav />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mx-auto max-w-6xl px-6 pt-6">
        <ol className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
          {props.crumbs.map((c, i) => (
            <li key={c.path} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              {i < props.crumbs.length - 1
                ? <Link href={c.path} className="hover:text-cyan-300">{c.name}</Link>
                : <span className="text-slate-400">{c.name}</span>}
            </li>
          ))}
        </ol>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-10 pt-8">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute left-1/2 top-[-160px] h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-cyan-500/12 blur-[130px]" />
        </div>
        <div className="relative mx-auto max-w-4xl">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1.5 text-sm text-cyan-300">
            <MapPin className="h-3.5 w-3.5" /> Serving {props.place}
          </span>
          <h1 className="mb-5 text-3xl font-bold leading-tight md:text-5xl">{props.heading}</h1>
          <p className="max-w-3xl text-lg text-gray-300">{props.intro}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/qualify" className="rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 px-6 py-2.5 text-sm font-medium text-white shadow-[0_0_24px_rgba(139,92,246,0.4)]">See if you qualify</Link>
            <Link href="/advisor" className="rounded-full border border-white/15 px-6 py-2.5 text-sm font-medium text-white hover:border-cyan-400/40">Get a free debt plan</Link>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-6 text-2xl font-bold">How X Debt helps {props.place}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s) => (
              <Link key={s.title} href={s.href} className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-cyan-400/30">
                <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-600/20 text-cyan-300"><s.icon className="h-5 w-5" /></span>
                <h3 className="mb-1 font-semibold text-white group-hover:text-cyan-200">{s.title}</h3>
                <p className="text-sm text-slate-400">{s.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* State consumer-law facts */}
      <section className="bg-[#03040a] px-6 py-14">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 text-2xl font-bold">Debt &amp; consumer rights in {props.stateName}</h2>
          <p className="mb-6 text-sm text-slate-500">General information to help you understand your situation — not legal advice.</p>
          <div className="space-y-4">
            <Fact icon={Scale} title="Statute of limitations on debt" text={props.facts.sol} />
            <Fact icon={ShieldCheck} title="Wage garnishment" text={props.facts.garnish} />
            <Fact icon={Stethoscope} title="Medical bills & medical debt" text={props.facts.medical} />
          </div>
        </div>
      </section>

      {/* Child locations (counties/cities) */}
      {props.childLinks && props.childLinks.length > 0 && (
        <section className="px-6 py-12">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-5 text-xl font-bold">{props.childLabel}</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {props.childLinks.map((l) => (
                <Link key={l.href} href={l.href} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm text-slate-300 hover:border-cyan-400/30 hover:text-cyan-200">
                  <span>{l.label}{l.sub && <span className="ml-1 text-xs text-slate-600">{l.sub}</span>}</span>
                  <ChevronRight className="h-4 w-4 text-slate-600" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Related links (nearby) */}
      {props.relatedLinks && props.relatedLinks.length > 0 && (
        <section className="px-6 pb-12">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">{props.relatedLabel ?? "Nearby"}</h2>
            <div className="flex flex-wrap gap-2">
              {props.relatedLinks.map((l) => (
                <Link key={l.href} href={l.href} className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-400 hover:border-cyan-400/30 hover:text-cyan-200">{l.label}</Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="border-t border-white/10 bg-[#03040a] px-6 py-14">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-2xl font-bold">Frequently asked questions — {props.place}</h2>
          <div className="space-y-3">
            {props.faqs.map((f) => (
              <details key={f.q} className="group rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <summary className="cursor-pointer list-none font-semibold text-white marker:hidden">{f.q}</summary>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-8 text-xs text-slate-600">
            X Debt by VidDazzle LLC serves {props.place} online and by phone, 24/7. We are not a law firm and do not provide
            legal advice. Program disclosures apply — see our{" "}
            <Link href="/legal/disclosures" className="underline hover:text-cyan-300">disclosures</Link>.
          </p>
        </div>
      </section>

      <SolvanaFooter />
    </div>
  );
}

function Fact({ icon: Icon, title, text }: { icon: React.ComponentType<{ className?: string }>; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h3 className="mb-1 flex items-center gap-2 font-semibold text-white"><Icon className="h-4 w-4 text-cyan-300" /> {title}</h3>
      <p className="text-sm leading-relaxed text-slate-400">{text}</p>
    </div>
  );
}

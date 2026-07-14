import type { Metadata } from "next";
import Link from "next/link";
import SolvanaNav from "@/components/solvana/nav";
import SolvanaFooter from "@/components/solvana/footer";
import { JsonLd, pageMetadata, breadcrumbLd, SITE_URL } from "@/lib/solvana/seo";
import { allStates, geoCounts } from "@/lib/geo";
import { MapPin, ChevronRight } from "lucide-react";

export const metadata: Metadata = pageMetadata({
  title: "Service Areas — Debt Relief & Consumer Advocacy Across the U.S.",
  description:
    "X Debt serves all 50 states, every county, and every city — online and by phone, 24/7. Free debt-payoff plans, AI debt settlement, medical-bill audits, and document analysis. Launching in Pensacola, Florida.",
  path: "/locations",
});

export default function LocationsHub() {
  const states = allStates();
  const counts = geoCounts();
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Locations", path: "/locations" },
  ];

  return (
    <div className="bg-[#050810] font-sans text-white">
      <JsonLd data={[breadcrumbLd(crumbs), {
        "@context": "https://schema.org", "@type": "Service",
        name: "Debt Relief & Consumer Advocacy — Nationwide",
        provider: { "@id": `${SITE_URL}/#organization` },
        areaServed: { "@type": "Country", name: "United States" },
        url: `${SITE_URL}/locations`,
        description: "X Debt serves all 50 U.S. states, counties, and cities online and by phone, 24/7.",
      }]} />
      <SolvanaNav />

      <section className="relative overflow-hidden px-6 pb-8 pt-14 text-center">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute left-1/2 top-[-150px] h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-cyan-500/12 blur-[130px]" />
        </div>
        <div className="relative mx-auto max-w-3xl">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1.5 text-sm text-cyan-300">
            <MapPin className="h-3.5 w-3.5" /> Nationwide, online &amp; by phone 24/7
          </span>
          <h1 className="mb-5 text-4xl font-bold md:text-5xl">Where we help</h1>
          <p className="text-lg text-gray-300">
            X Debt serves all 50 states, every county, and every city in the country — no office visit required. We&apos;re
            launching in <Link href="/locations/florida/pensacola" className="text-cyan-300 underline hover:text-cyan-200">Pensacola, Florida</Link> and rolling out nationwide.
          </p>
        </div>
      </section>

      {/* Launch market highlight */}
      <section className="px-6 pb-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-cyan-400/25 bg-gradient-to-b from-cyan-500/10 to-transparent p-6 text-center">
          <p className="text-sm uppercase tracking-wide text-cyan-300">Launch market</p>
          <h2 className="mt-1 text-2xl font-bold">Pensacola &amp; Escambia County, Florida</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">Deep local coverage across the Pensacola metro — Escambia and Santa Rosa Counties and the Emerald Coast.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href="/locations/florida/pensacola" className="rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 px-5 py-2 text-sm font-medium text-white">Pensacola</Link>
            <Link href="/locations/florida/county/escambia-county" className="rounded-full border border-white/15 px-5 py-2 text-sm text-white hover:border-cyan-400/40">Escambia County</Link>
            <Link href="/locations/florida" className="rounded-full border border-white/15 px-5 py-2 text-sm text-white hover:border-cyan-400/40">All of Florida</Link>
          </div>
        </div>
      </section>

      {/* All states */}
      <section className="px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-5 text-xl font-bold">Browse by state</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {states.map((s) => (
              <Link key={s.slug} href={`/locations/${s.slug}`} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm text-slate-300 hover:border-cyan-400/30 hover:text-cyan-200">
                <span>{s.name}</span>
                <ChevronRight className="h-4 w-4 text-slate-600" />
              </Link>
            ))}
          </div>
          <p className="mt-6 text-xs text-slate-600">Currently mapping {counts.cities.toLocaleString()} cities and {counts.counties.toLocaleString()} counties across {counts.states} states and DC, and growing toward full national coverage.</p>
        </div>
      </section>

      <SolvanaFooter />
    </div>
  );
}

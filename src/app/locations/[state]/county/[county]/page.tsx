import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LocationView from "@/components/locations/location-view";
import { JsonLd, pageMetadata, breadcrumbLd, faqLd, SITE_URL } from "@/lib/solvana/seo";
import { getState, getCounty, citiesInCounty } from "@/lib/geo";
import { stateFacts, localFaqs } from "@/lib/geo/content";

export const dynamicParams = true;

// County pages render on-demand (cached); we don't prebuild the long tail.
export function generateStaticParams() {
  return [] as { state: string; county: string }[];
}

async function resolve(params: Promise<{ state: string; county: string }>) {
  const { state: stateSlug, county: countySlug } = await params;
  const state = getState(stateSlug);
  const county = state ? getCounty(stateSlug, countySlug) : undefined;
  return { stateSlug, countySlug, state, county };
}

export async function generateMetadata({ params }: { params: Promise<{ state: string; county: string }> }): Promise<Metadata> {
  const { state, county, stateSlug, countySlug } = await resolve(params);
  if (!state || !county) return {};
  return pageMetadata({
    title: `Debt Relief & Consumer Advocacy in ${county.name}, ${state.abbr}`,
    description: `Free debt-payoff plans, AI debt settlement, medical-bill audits, and document analysis across ${county.name}, ${state.name}. No upfront fees. Know your ${state.name} consumer rights.`,
    path: `/locations/${stateSlug}/county/${countySlug}`,
  });
}

export default async function CountyPage({ params }: { params: Promise<{ state: string; county: string }> }) {
  const { state, county, stateSlug, countySlug } = await resolve(params);
  if (!state || !county) notFound();

  const place = `${county.name}, ${state.name}`;
  const facts = stateFacts(state.abbr, state.name);
  const faqs = localFaqs({ place, stateName: state.name, abbr: state.abbr });
  const path = `/locations/${stateSlug}/county/${countySlug}`;
  const cities = citiesInCounty(state.abbr, countySlug);

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Locations", path: "/locations" },
    { name: state.name, path: `/locations/${stateSlug}` },
    { name: county.name, path },
  ];

  const childLinks = cities.map((c) => ({ label: c.name, href: `/locations/${stateSlug}/${c.slug}` }));

  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `Debt Relief & Consumer Advocacy in ${county.name}, ${state.name}`,
    provider: { "@id": `${SITE_URL}/#organization` },
    areaServed: {
      "@type": "AdministrativeArea",
      name: county.name,
      containedInPlace: { "@type": "State", name: state.name },
    },
    url: `${SITE_URL}${path}`,
    description: `X Debt serves all of ${place} with free debt-payoff plans, AI-negotiated debt settlement, medical-bill auditing, and document analysis.`,
  };

  const intro = `X Debt by VidDazzle LLC serves every community in ${place}${county.seat ? `, from the county seat in ${county.seat} outward` : ""}. Get a free debt-payoff plan, let our AI agents negotiate qualifying unsecured debt into a one-time settlement with no upfront fees, audit your medical bills for errors, and understand the contracts and policies behind your finances — all online, 24/7, grounded in your ${state.name} consumer rights.`;

  return (
    <>
      <JsonLd data={[breadcrumbLd(crumbs), faqLd(faqs), serviceLd]} />
      <LocationView
        heading={`Debt Relief & Consumer Advocacy in ${county.name}`}
        place={place}
        stateName={state.name}
        intro={intro}
        facts={facts}
        faqs={faqs}
        crumbs={crumbs}
        childLabel={cities.length ? `Cities & communities in ${county.name}` : undefined}
        childLinks={childLinks.length ? childLinks : undefined}
      />
    </>
  );
}

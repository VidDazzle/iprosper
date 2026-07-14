import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LocationView from "@/components/locations/location-view";
import { JsonLd, pageMetadata, breadcrumbLd, faqLd, SITE_URL } from "@/lib/solvana/seo";
import { getState, citiesInState, countiesInState, allStateParams } from "@/lib/geo";
import { stateFacts, localFaqs } from "@/lib/geo/content";

export const dynamicParams = true;

export function generateStaticParams() {
  return allStateParams();
}

export async function generateMetadata({ params }: { params: Promise<{ state: string }> }): Promise<Metadata> {
  const { state: stateSlug } = await params;
  const state = getState(stateSlug);
  if (!state) return {};
  return pageMetadata({
    title: `Debt Relief & Consumer Advocacy in ${state.name}`,
    description: `Free debt-payoff plans, AI debt settlement, medical-bill audits, and document analysis across ${state.name}. No upfront fees. Understand your ${state.name} debt, garnishment, and medical-billing rights.`,
    path: `/locations/${stateSlug}`,
  });
}

export default async function StatePage({ params }: { params: Promise<{ state: string }> }) {
  const { state: stateSlug } = await params;
  const state = getState(stateSlug);
  if (!state) notFound();

  const place = state.name;
  const facts = stateFacts(state.abbr, state.name);
  const faqs = localFaqs({ place, stateName: state.name, abbr: state.abbr });
  const path = `/locations/${stateSlug}`;
  const cities = citiesInState(state.abbr);
  const counties = countiesInState(state.abbr);

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Locations", path: "/locations" },
    { name: state.name, path },
  ];

  const cityLinks = cities.map((c) => ({ label: c.name, href: `/locations/${stateSlug}/${c.slug}`, sub: c.county.replace(/ County| Parish| Borough/, "") }));
  const countyLinks = counties.map((c) => ({ label: c.name, href: `/locations/${stateSlug}/county/${c.slug}` }));

  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `Debt Relief & Consumer Advocacy in ${state.name}`,
    provider: { "@id": `${SITE_URL}/#organization` },
    areaServed: { "@type": "State", name: state.name },
    url: `${SITE_URL}${path}`,
    description: `X Debt serves all of ${state.name} with free debt-payoff plans, AI-negotiated debt settlement, medical-bill auditing, and document analysis.`,
  };

  const intro = `X Debt by VidDazzle LLC helps people across ${state.name} — from ${state.capital} to every town and county — get out of debt and stand up for their consumer rights. Build a free debt-payoff plan, let our AI agents negotiate qualifying unsecured debt into a one-time settlement with no upfront fees, audit medical bills for errors, and analyze the insurance policies and contracts behind your finances. Everything runs online and by phone, 24/7.`;

  return (
    <>
      <JsonLd data={[breadcrumbLd(crumbs), faqLd(faqs), serviceLd]} />
      <LocationView
        heading={`Debt Relief & Consumer Advocacy in ${state.name}`}
        place={place}
        stateName={state.name}
        intro={intro}
        facts={facts}
        faqs={faqs}
        crumbs={crumbs}
        childLabel={cities.length ? `Cities we serve in ${state.name}` : undefined}
        childLinks={cityLinks.length ? cityLinks : undefined}
        relatedLabel={counties.length ? `Counties in ${state.name}` : undefined}
        relatedLinks={countyLinks.length ? countyLinks : undefined}
      />
    </>
  );
}

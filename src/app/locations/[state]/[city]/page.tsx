import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LocationView from "@/components/locations/location-view";
import { JsonLd, pageMetadata, breadcrumbLd, faqLd, SITE_URL } from "@/lib/solvana/seo";
import { getState, getCity, getCounty, nearbyCities, priorityCityParams } from "@/lib/geo";
import { stateFacts, localFaqs } from "@/lib/geo/content";

export const dynamicParams = true;

export function generateStaticParams() {
  return priorityCityParams();
}

async function resolve(params: Promise<{ state: string; city: string }>) {
  const { state: stateSlug, city: citySlug } = await params;
  const state = getState(stateSlug);
  const city = state ? getCity(stateSlug, citySlug) : undefined;
  return { stateSlug, citySlug, state, city };
}

export async function generateMetadata({ params }: { params: Promise<{ state: string; city: string }> }): Promise<Metadata> {
  const { state, city, stateSlug, citySlug } = await resolve(params);
  if (!state || !city) return {};
  return pageMetadata({
    title: `Debt Relief & Consumer Advocacy in ${city.name}, ${state.abbr}`,
    description: `Free debt-payoff plans, AI debt settlement, medical-bill audits, and document analysis for ${city.name}, ${state.name}. No upfront fees. Know your ${state.name} consumer rights. Available online 24/7.`,
    path: `/locations/${stateSlug}/${citySlug}`,
  });
}

export default async function CityPage({ params }: { params: Promise<{ state: string; city: string }> }) {
  const { state, city, stateSlug, citySlug } = await resolve(params);
  if (!state || !city) notFound();

  const place = `${city.name}, ${state.name}`;
  const facts = stateFacts(state.abbr, state.name);
  const faqs = localFaqs({ place, stateName: state.name, abbr: state.abbr });
  const county = getCounty(stateSlug, city.countySlug);
  const path = `/locations/${stateSlug}/${citySlug}`;

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Locations", path: "/locations" },
    { name: state.name, path: `/locations/${stateSlug}` },
    ...(county ? [{ name: county.name, path: `/locations/${stateSlug}/county/${county.slug}` }] : []),
    { name: city.name, path },
  ];

  const related = nearbyCities(city, 10).map((c) => ({ label: c.name, href: `/locations/${stateSlug}/${c.slug}` }));

  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `Debt Relief & Consumer Advocacy in ${city.name}, ${state.name}`,
    serviceType: "Debt settlement, credit counseling, and consumer advocacy",
    provider: { "@id": `${SITE_URL}/#organization` },
    areaServed: {
      "@type": "City",
      name: city.name,
      containedInPlace: { "@type": "State", name: state.name },
    },
    url: `${SITE_URL}${path}`,
    description: `X Debt serves ${place} with free debt-payoff plans, AI-negotiated debt settlement, medical-bill auditing, and document analysis.`,
  };

  const intro = `X Debt by VidDazzle LLC helps people in ${place} take control of what they owe — without setting foot in an office. Our AI agents build you a free, personalized debt-payoff plan, negotiate qualifying unsecured debt down to a one-time settlement with no upfront fees, audit your medical bills for errors, and analyze the insurance policies and contracts that shape your finances. Everything runs online and by phone, around the clock, and every step is grounded in your ${state.name} consumer rights.`;

  return (
    <>
      <JsonLd data={[breadcrumbLd(crumbs), faqLd(faqs), serviceLd]} />
      <LocationView
        heading={`Debt Relief & Consumer Advocacy in ${city.name}, ${state.name}`}
        place={place}
        stateName={state.name}
        intro={intro}
        facts={facts}
        faqs={faqs}
        crumbs={crumbs}
        relatedLabel={county ? `More cities near ${city.name}` : `More cities in ${state.name}`}
        relatedLinks={related}
      />
    </>
  );
}

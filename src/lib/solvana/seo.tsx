/**
 * SEO + GEO (Generative Engine Optimization) helpers for X Debt.
 *
 * Beyond classic SEO, these emit schema.org JSON-LD so AI assistants and
 * answer engines (ChatGPT, Perplexity, Gemini, Google AI Overviews) can
 * understand, quote, and cite X Debt accurately. See also /llms.txt.
 */

import type { Metadata } from "next";
import { BRAND, PROGRAM } from "./brand";

export const SITE_URL = "https://xdebt.ai";
const OG_IMAGE = `${SITE_URL}/og.png`;

/** Base metadata every page inherits/extends. */
export function baseMetadata(): Metadata {
  return {
    metadataBase: new URL(SITE_URL),
    applicationName: BRAND.name,
    title: {
      default: "X Debt — AI Debt Settlement | Owe Less. Live More.",
      template: "%s | X Debt",
    },
    description: BRAND.description,
    keywords: [
      "debt settlement",
      "AI debt relief",
      "credit card debt relief",
      "medical bill settlement",
      "personal loan settlement",
      "debt negotiation",
      "lower credit card debt",
      "settle debt for less",
      "debt relief program",
      "no upfront fee debt settlement",
    ],
    authors: [{ name: "VidDazzle LLC" }],
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: BRAND.name,
      title: "X Debt — AI Debt Settlement",
      description: BRAND.description,
      url: SITE_URL,
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "X Debt — AI-powered debt settlement" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "X Debt — AI Debt Settlement",
      description: BRAND.description,
      images: [OG_IMAGE],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
    category: "finance",
  };
}

/** Per-page metadata helper. */
export function pageMetadata(opts: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: opts.path },
    openGraph: {
      title: `${opts.title} | X Debt`,
      description: opts.description,
      url: `${SITE_URL}${opts.path}`,
      images: [{ url: OG_IMAGE, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${opts.title} | X Debt`,
      description: opts.description,
      images: [OG_IMAGE],
    },
  };
}

/* ---------------------------- JSON-LD builders ---------------------------- */

export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FinancialService",
    "@id": `${SITE_URL}/#organization`,
    name: BRAND.name,
    legalName: "VidDazzle LLC",
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.png`,
    description: BRAND.description,
    slogan: BRAND.tagline,
    email: "hello@xdebt.ai",
    telephone: "+1-888-765-8262",
    areaServed: "US",
    knowsAbout: [
      "Debt settlement",
      "Unsecured debt negotiation",
      "Credit card debt relief",
      "Medical debt relief",
      "FTC Telemarketing Sales Rule compliance",
    ],
    serviceType: "Debt settlement",
    priceRange: `${PROGRAM.feePctLow}%–${PROGRAM.feePctHigh}% of enrolled debt, performance-based`,
    sameAs: [
      "https://www.facebook.com/xdebt.ai",
      "https://www.instagram.com/xdebt.ai",
      "https://www.tiktok.com/@xdebt.ai",
      "https://www.youtube.com/@xdebt.ai",
      "https://www.linkedin.com/company/solvana-ai",
      "https://x.com/solvana_ai",
    ],
  };
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: BRAND.name,
    description: BRAND.description,
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

export function serviceLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "AI Debt Settlement Program",
    provider: { "@id": `${SITE_URL}/#organization` },
    areaServed: "US",
    description:
      "X Debt's AI voice agents negotiate with creditors to settle unsecured debts (credit cards, medical bills, personal loans) for a reduced one-time lump sum. No upfront fees.",
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      description: `Performance fee of ${PROGRAM.feePctLow}%–${PROGRAM.feePctHigh}% of enrolled debt, charged only after a debt is settled.`,
      eligibleCustomerType: "Consumers and businesses with $7,500+ in unsecured debt",
    },
    termsOfService: `${SITE_URL}/legal/terms`,
  };
}

/** FAQPage LD from a list of Q/A pairs — high-value for AI answer engines. */
export function faqLd(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${SITE_URL}${it.path}`,
    })),
  };
}

/** Renders one or more JSON-LD blocks. Use in a Server Component. */
export function JsonLd({ data }: { data: object | object[] }) {
  const blocks = Array.isArray(data) ? data : [data];
  return blocks.map((block, i) => (
    <script
      key={i}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
    />
  ));
}

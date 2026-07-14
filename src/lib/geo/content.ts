/**
 * Localized content for location pages. This is what keeps programmatic pages
 * substantive rather than thin: each page carries genuinely useful, state-
 * specific consumer facts (debt statute of limitations, wage-garnishment rules,
 * medical-billing protections) plus localized FAQs that answer engines can quote.
 *
 * Everything here is general consumer information, NOT legal advice. Figures are
 * framed as "generally" and ranges, and every surface repeats the caveat.
 */

export interface StateFacts {
  sol: string;      // statute of limitations on consumer debt
  garnish: string;  // wage garnishment posture
  medical: string;  // medical-billing / medical-debt note
}

const GENERIC = (state: string): StateFacts => ({
  sol: `In ${state}, the statute of limitations on most consumer debt generally runs about 3–6 years from your last payment, depending on the type of debt. After it passes, a creditor can still ask but generally can't win a lawsuit to force payment — and making a payment can restart the clock.`,
  garnish: `${state} follows federal wage-garnishment limits, and some consumer debts require a court judgment first. Certain income (Social Security, many benefits) is generally protected.`,
  medical: `Federal protections apply in ${state}: the No Surprises Act limits most surprise and balance bills, nonprofit hospitals must offer financial assistance (501(r)), and recent rules limit medical debt on credit reports.`,
});

/** Known state specifics layered on top of the generic baseline. */
const SPECIFICS: Record<string, Partial<StateFacts>> = {
  FL: {
    sol: "In Florida, the statute of limitations on most credit-card and written-contract debt is generally 4–5 years from your last payment. After it runs, the debt is 'time-barred' — a creditor can still ask, but generally can't win a lawsuit — and making a new payment can restart the clock.",
    garnish: "Florida has one of the strongest wage protections in the country: if you qualify as 'head of household,' your wages are largely exempt from garnishment for consumer debts. Social Security and many benefits are also protected.",
    medical: "Florida has balance-billing protections for emergency and certain in-network facility care, and providers must give price estimates on request — on top of the federal No Surprises Act and 501(r) charity-care rules.",
  },
  CA: {
    sol: "In California, the statute of limitations on most written-contract and credit-card debt is generally 4 years from your last payment.",
    garnish: "California caps wage garnishment below the federal limit and requires a court judgment for most consumer debts; low earners are further protected.",
    medical: "California's Hospital Fair Pricing Act gives eligible patients charity care and discounted payments, and the state limits medical debt in collections and on credit reports.",
  },
  TX: {
    sol: "In Texas, the statute of limitations on most consumer debt is generally 4 years from your last payment.",
    garnish: "Texas does not allow wage garnishment for most consumer debts at all — only for things like child support, taxes, and student loans. This makes Texas unusually protective for consumers.",
    medical: "Texas offers surprise-billing mediation/arbitration for certain out-of-network bills and has itemized-bill and hospital financial-assistance requirements.",
  },
  NY: {
    sol: "In New York, the statute of limitations on consumer credit-card debt is 3 years under the Consumer Credit Fairness Act (2022) — shorter than most states.",
    garnish: "New York caps consumer-debt wage garnishment (generally 10% of gross or the federal limit, whichever is less) and requires a judgment first.",
    medical: "New York limits hospital charges for eligible patients, has a surprise-billing law with independent dispute resolution, and restricts medical debt on credit reports.",
  },
  CO: {
    medical: "Colorado bars medical debt from appearing on credit reports, has surprise-billing protections, and requires hospital financial-assistance screening.",
    sol: "In Colorado, the statute of limitations on most consumer debt is generally 6 years, and 3 years for certain debts.",
  },
  IL: {
    sol: "In Illinois, the statute of limitations is generally 5 years for oral/open accounts and up to 10 years for written contracts.",
    medical: "Illinois has the Hospital Uninsured Patient Discount Act and the Fair Patient Billing Act governing medical collections and financial assistance.",
  },
  GA: { sol: "In Georgia, the statute of limitations on written contracts is generally 6 years; open accounts and credit cards about 4–6 years." },
  NC: {
    sol: "In North Carolina, the statute of limitations on most consumer debt is generally 3 years.",
    garnish: "North Carolina does not allow wage garnishment for most ordinary consumer debts.",
  },
  SC: { garnish: "South Carolina does not allow wage garnishment for most consumer debts." },
  PA: { garnish: "Pennsylvania does not allow wage garnishment for most consumer debts (with limited exceptions)." },
  WA: { sol: "In Washington, the statute of limitations is generally 6 years for written contracts and 3 years for open accounts." },
  OH: { sol: "In Ohio, the statute of limitations on written-contract debt is generally 6 years." },
  MI: { sol: "In Michigan, the statute of limitations on most consumer debt is generally 6 years." },
  AZ: { sol: "In Arizona, the statute of limitations on credit-card debt is generally 6 years." },
  VA: { sol: "In Virginia, the statute of limitations is generally 3 years for open accounts and up to 5 years for written contracts." },
};

export function stateFacts(abbr: string, stateName: string): StateFacts {
  const base = GENERIC(stateName);
  const s = SPECIFICS[abbr];
  return s ? { ...base, ...s } : base;
}

// --- localized FAQ (drives both on-page copy and FAQPage JSON-LD) -----------

export interface Faq { q: string; a: string }

export function localFaqs(opts: { place: string; stateName: string; abbr: string }): Faq[] {
  const { place, stateName, abbr } = opts;
  const f = stateFacts(abbr, stateName);
  return [
    {
      q: `Can X Debt help me get out of debt in ${place}?`,
      a: `Yes. X Debt serves consumers throughout ${place} and all of ${stateName}. Start with a free, personalized debt-payoff plan for any kind of debt, and — for qualifying unsecured debt like credit cards, medical bills, and personal loans — our AI agents can negotiate settlements for less than you owe. Everything runs online and by phone, 24/7.`,
    },
    {
      q: `Is debt settlement legal in ${stateName}?`,
      a: `Debt settlement is legal in ${stateName}. X Debt follows the FTC Telemarketing Sales Rule, which means no upfront fees — a fee is charged only after a debt is actually settled, you approve the terms, and you make a payment toward it.`,
    },
    {
      q: `What is the statute of limitations on debt in ${stateName}?`,
      a: `${f.sol} This is general information, not legal advice — confirm your specific situation with a licensed ${stateName} attorney.`,
    },
    {
      q: `Can my wages be garnished for debt in ${stateName}?`,
      a: `${f.garnish} This is general information, not legal advice.`,
    },
    {
      q: `Can you review a medical bill, insurance policy, or contract in ${place}?`,
      a: `Yes. Our Medical Bill Advocate audits itemized hospital bills for errors, and Law & Armor analyzes insurance policies, leases, and contracts — explaining them in plain English and flagging your rights. ${f.medical} We analyze and provide intelligence only; we don't give legal advice, and we discard your documents after analysis.`,
    },
    {
      q: `Do I need to visit an office in ${place}?`,
      a: `No. X Debt is operated entirely by AI and runs online and by phone, so you can get help from anywhere in ${place} at any hour. If you want in-person legal representation, we can connect you with a licensed attorney who advertises in your area.`,
    },
  ];
}

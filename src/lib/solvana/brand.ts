/**
 * Solvana brand + program constants.
 * Single source of truth for program terms quoted across the site,
 * the agent framework, and the legal pages.
 */

export const BRAND = {
  name: "Solvana",
  domain: "solvana.ai",
  tagline: "Settle smarter. Owe less.",
  description:
    "Solvana is a fully AI-operated debt settlement platform. Specialized AI voice agents analyze your unsecured debt, build your savings plan, and negotiate with your creditors to accept less than you owe — with zero upfront fees.",
} as const;

export const PROGRAM = {
  /** Minimum qualifying unsecured debt to enroll (USD). */
  minDebt: 7500,
  /** Preferred qualifying threshold quoted in marketing (USD). */
  typicalMinDebt: 10000,
  /** Performance fee charged only after a debt is settled, as % of enrolled debt. */
  feePctLow: 15,
  feePctHigh: 25,
  /** Typical program length in months. */
  termLowMonths: 24,
  termHighMonths: 36,
  /** Debt types the program can enroll. */
  eligibleDebts: [
    "Credit cards",
    "Medical bills",
    "Personal loans",
    "Store / retail cards",
    "Collections & charge-offs",
    "Private business debt (unsecured)",
  ],
  /** Debt types the program can never enroll. */
  ineligibleDebts: [
    "Mortgages & home equity loans",
    "Auto loans and leases",
    "Federal student loans",
    "Tax debt (IRS / state)",
    "Child support & alimony",
    "Secured debt of any kind",
  ],
} as const;

/** Estimate program numbers for a given enrolled debt amount. */
export function estimateProgram(enrolledDebt: number) {
  // Typical negotiated settlement lands around 40–60% of the enrolled balance.
  const settlementLow = enrolledDebt * 0.4;
  const settlementHigh = enrolledDebt * 0.6;
  const feeLow = enrolledDebt * (PROGRAM.feePctLow / 100);
  const feeHigh = enrolledDebt * (PROGRAM.feePctHigh / 100);
  const totalCostLow = settlementLow + feeLow;
  const totalCostHigh = settlementHigh + feeHigh;
  const monthlyLow = totalCostLow / PROGRAM.termHighMonths;
  const monthlyHigh = totalCostHigh / PROGRAM.termLowMonths;
  return {
    enrolledDebt,
    settlementLow,
    settlementHigh,
    feeLow,
    feeHigh,
    totalCostLow,
    totalCostHigh,
    savingsLow: enrolledDebt - totalCostHigh,
    savingsHigh: enrolledDebt - totalCostLow,
    monthlyLow,
    monthlyHigh,
    termLowMonths: PROGRAM.termLowMonths,
    termHighMonths: PROGRAM.termHighMonths,
  };
}

export const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/**
 * The debt-reduction playbook — practical, often-overlooked strategies for
 * every debt type. Surfaced free in the Debt Reduction Advisor, personalized
 * to the debts a user actually has. `lesserKnown` flags the tactics most people
 * have never heard of.
 *
 * Educational only — not financial, tax, or legal advice.
 */

import type { DebtType } from "./payoff";

export interface Strategy {
  title: string;
  detail: string;
  lesserKnown?: boolean;
}

export const DEBT_TYPE_LABELS: Record<DebtType, string> = {
  credit_card: "Credit card",
  mortgage: "Mortgage",
  auto: "Auto loan",
  student: "Student loan",
  medical: "Medical bill",
  heloc: "HELOC / home equity",
  personal_line: "Personal line of credit",
  personal_loan: "Personal loan",
  bill: "Bill / utility",
  other: "Other debt",
};

export const STRATEGIES: Record<DebtType, Strategy[]> = {
  credit_card: [
    { title: "Ask for a lower APR — in one phone call", detail: "Call the number on your card and ask for a rate reduction, citing your on-time history or a competing offer. Roughly half of people who ask get a cut, and it costs nothing.", lesserKnown: true },
    { title: "Pay before the statement date, not the due date", detail: "Your issuer reports the balance on your statement date. Paying a few days before it lowers the balance reported to the bureaus, which can raise your credit score without paying a cent more.", lesserKnown: true },
    { title: "0% balance-transfer runway", detail: "Move high-APR balances to a 0% intro-APR card and every dollar goes to principal during the promo window. Mind the transfer fee (3–5%) and pay it off before the rate resets." },
    { title: "Two payments a month (biweekly)", detail: "Splitting your payment in half and paying every two weeks lowers your average daily balance, cutting the interest you're charged." },
  ],
  mortgage: [
    { title: "Recast instead of refinance after a lump sum", detail: "Put a lump sum toward principal and ask your servicer to 're-amortize' (recast) for a few hundred dollars. Your payment drops permanently with no closing costs and no credit check — most homeowners have never heard of it.", lesserKnown: true },
    { title: "One extra payment a year (biweekly plan)", detail: "Paying half your mortgage every two weeks makes 13 monthly payments a year instead of 12 — often cutting 4–6 years and tens of thousands in interest off a 30-year loan." },
    { title: "Cancel PMI at 20% equity", detail: "Once you reach 20% equity, request PMI removal in writing (you don't have to wait for automatic 22% removal). A cheap appraisal can prove it early if your home value rose.", lesserKnown: true },
    { title: "Audit your escrow", detail: "Servicers over-collect escrow and can quietly raise payments. Review the annual escrow analysis and dispute over-collection to free up cash flow." },
  ],
  auto: [
    { title: "Refinance when your credit improves", detail: "Auto rates track your credit. If your score climbed since purchase, refinancing can drop your APR several points — and dealers almost never tell you this is an option.", lesserKnown: true },
    { title: "Principal-only extra payments", detail: "Make a second payment each month marked 'principal only' so it doesn't just prepay future interest. Confirm your lender applies it correctly.", lesserKnown: true },
    { title: "Avoid rolling negative equity", detail: "Never fold what you still owe into a new car loan. If you're upside-down, keep the car and pay it down instead." },
  ],
  student: [
    { title: "Income-Driven Repayment can lower payments to $0", detail: "Federal IDR plans cap payments at a share of discretionary income — sometimes $0 — and forgive the balance after 20–25 years. Recertify income each year.", lesserKnown: true },
    { title: "Public Service Loan Forgiveness (PSLF)", detail: "120 qualifying payments while working for a government or nonprofit employer wipes the remaining federal balance tax-free. Many eligible borrowers never enroll.", lesserKnown: true },
    { title: "Employer student-loan repayment", detail: "Employers can pay up to $5,250/year of your student loans tax-free. Ask HR — many offer it and it goes unused." },
    { title: "Refinance private loans only", detail: "Refinancing can lower private-loan rates, but refinancing federal loans forfeits IDR, forgiveness, and forbearance protections. Keep federal loans federal." },
  ],
  medical: [
    { title: "Ask for an itemized bill and audit it", detail: "Request a fully itemized bill — error rates are high (duplicate charges, services never rendered). Disputing errors alone often cuts the total.", lesserKnown: true },
    { title: "Apply for charity care / financial assistance", detail: "Nonprofit hospitals are required to offer financial-assistance programs that can reduce or erase bills based on income — even above the poverty line. Ask for the application by name.", lesserKnown: true },
    { title: "Negotiate the cash-pay rate", detail: "Offer to pay a lump sum at the insurer-negotiated (much lower) rate. Providers frequently accept 30–50% to avoid collections." },
    { title: "Never put medical debt on a credit card", detail: "Medical debt is often interest-free and has weaker credit-reporting rules. Moving it to a card strips those protections and starts the interest clock." },
  ],
  heloc: [
    { title: "Pay it down during the draw period", detail: "HELOC rates are variable and interest-only payments during the draw period don't touch principal. Paying principal now avoids a payment shock when repayment begins.", lesserKnown: true },
    { title: "Convert to a fixed rate", detail: "Many HELOCs let you lock a portion at a fixed rate. In a rising-rate environment this caps your risk — ask your lender about a fixed-rate conversion option.", lesserKnown: true },
    { title: "Prioritize it if rates are climbing", detail: "Because the rate floats, a HELOC can quietly become your most expensive debt. Treat it like high-interest debt when rates rise." },
  ],
  personal_line: [
    { title: "Watch the variable rate", detail: "Personal lines of credit usually carry variable rates with no fixed payoff date, so balances linger. Set your own payoff deadline and pay above the minimum.", lesserKnown: true },
    { title: "Stop the revolving cycle", detail: "Freeze new draws while you pay it down, or the balance never falls. Treat it like a fixed loan with a target end date." },
  ],
  personal_loan: [
    { title: "Refinance if your rate is high", detail: "Personal-loan rates vary widely by credit. If yours improved, a new loan or a credit-union loan can cut the APR — check for prepayment penalties first." },
    { title: "Target it in the avalanche", detail: "Personal loans often carry mid-to-high APRs. In the avalanche method they're usually near the front of the line." },
  ],
  bill: [
    { title: "Negotiate or ask for hardship programs", detail: "Utilities, phone, and internet providers have retention and hardship programs that lower bills or pause fees — you just have to ask.", lesserKnown: true },
    { title: "Budget billing to smooth cash flow", detail: "Level/budget billing averages seasonal bills into a steady monthly amount, making it easier to plan your payoff budget." },
  ],
  other: [
    { title: "List it, rank it, attack it", detail: "Add every balance with its rate so the plan can order your payoff. Unknown or forgotten debts are where interest quietly compounds." },
  ],
};

/** Universal strategies shown regardless of debt mix. */
export const UNIVERSAL_STRATEGIES: Strategy[] = [
  { title: "The avalanche vs. snowball choice", detail: "Avalanche (highest APR first) saves the most money; snowball (smallest balance first) delivers faster wins. Your plan picks the best fit — and the difference in total cost is usually small, so momentum matters.", lesserKnown: false },
  { title: "Send extra as 'principal only'", detail: "Unless you specify, lenders often apply extra payments to future interest, not principal. Always label extra payments 'principal only' and confirm they landed there.", lesserKnown: true },
  { title: "Automate every windfall", detail: "Route tax refunds, bonuses, and raises straight to your target debt before you can spend them. A single refund can erase months of interest.", lesserKnown: false },
  { title: "Build a $1,000 buffer first", detail: "A small starter emergency fund keeps a flat tire or copay from going back on a credit card and undoing your progress.", lesserKnown: false },
];

export function strategiesForTypes(types: DebtType[]): { type: DebtType; items: Strategy[] }[] {
  const unique = [...new Set(types)];
  return unique.map((type) => ({ type, items: STRATEGIES[type] ?? STRATEGIES.other }));
}

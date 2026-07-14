/**
 * Debt payoff engine — pure, deterministic simulation used by the free
 * Debt Reduction Advisor. Works for every debt type (mortgages, cards, auto,
 * student, medical, HELOC, personal lines, bills). No external calls.
 */

export type DebtType =
  | "credit_card"
  | "mortgage"
  | "auto"
  | "student"
  | "medical"
  | "heloc"
  | "personal_line"
  | "personal_loan"
  | "bill"
  | "other";

export interface DebtInput {
  id: string;
  name: string;
  type: DebtType;
  balance: number;
  apr: number; // annual %, e.g. 22.99
  minPayment: number;
}

export type Strategy = "avalanche" | "snowball";

export interface PayoffResult {
  months: number;
  totalInterest: number;
  totalPaid: number;
  /** Order debts are fully paid, with the month each is cleared. */
  payoffOrder: { id: string; name: string; monthCleared: number }[];
  feasible: boolean; // false if minimums don't cover interest
}

export interface AdvisorResult {
  disposableIncome: number;
  extraToDebt: number;
  strategy: Strategy;
  plan: PayoffResult;
  /** Baseline: minimum payments only, no strategy ordering. */
  baseline: PayoffResult;
  interestSaved: number;
  monthsSaved: number;
  recommendedStrategy: Strategy;
  recommendationReason: string;
}

const MAX_MONTHS = 720; // 60 years hard cap

function orderDebts(debts: DebtInput[], strategy: Strategy): DebtInput[] {
  const copy = [...debts];
  copy.sort((a, b) =>
    strategy === "avalanche" ? b.apr - a.apr : a.balance - b.balance
  );
  return copy;
}

/**
 * Simulate month-by-month payoff. Each month: accrue interest, pay every
 * minimum, then throw all remaining budget (extra + freed-up minimums from
 * already-paid debts) at the current target per the chosen strategy.
 */
export function simulatePayoff(
  debtsInput: DebtInput[],
  extraMonthly: number,
  strategy: Strategy
): PayoffResult {
  const debts = orderDebts(debtsInput, strategy).map((d) => ({ ...d }));
  const totalMin = debts.reduce((s, d) => s + d.minPayment, 0);
  let month = 0;
  let totalInterest = 0;
  let totalPaid = 0;
  const payoffOrder: PayoffResult["payoffOrder"] = [];
  const clearedIds = new Set<string>();

  while (debts.some((d) => d.balance > 0.01) && month < MAX_MONTHS) {
    month++;
    // 1) Accrue interest.
    for (const d of debts) {
      if (d.balance > 0) {
        const interest = (d.balance * (d.apr / 100)) / 12;
        d.balance += interest;
        totalInterest += interest;
      }
    }
    // 2) Budget available this month = all minimums + extra.
    let budget = totalMin + extraMonthly;
    // Pay each debt at least its minimum (or its balance if smaller).
    for (const d of debts) {
      if (d.balance <= 0) continue;
      const pay = Math.min(d.minPayment, d.balance, budget);
      d.balance -= pay;
      budget -= pay;
      totalPaid += pay;
    }
    // 3) Snowball the remaining budget onto the target debts in order.
    for (const d of debts) {
      if (budget <= 0) break;
      if (d.balance <= 0) continue;
      const pay = Math.min(d.balance, budget);
      d.balance -= pay;
      budget -= pay;
      totalPaid += pay;
    }
    // 4) Record newly cleared debts.
    for (const d of debts) {
      if (d.balance <= 0.01 && !clearedIds.has(d.id)) {
        clearedIds.add(d.id);
        payoffOrder.push({ id: d.id, name: d.name, monthCleared: month });
      }
    }
  }

  const feasible = month < MAX_MONTHS;
  return { months: month, totalInterest, totalPaid, payoffOrder, feasible };
}

/** Full advisor computation: budget → allocation → plan vs. baseline. */
export function buildPlan(params: {
  debts: DebtInput[];
  monthlyIncome: number;
  monthlyExpenses: number;
  extraToDebt?: number; // if omitted, use all disposable income
  strategy?: Strategy;
}): AdvisorResult {
  const disposableIncome = Math.max(0, params.monthlyIncome - params.monthlyExpenses);
  const extraToDebt = Math.max(0, params.extraToDebt ?? disposableIncome);

  // Recommend avalanche when APR spread is meaningful (saves the most money);
  // recommend snowball when balances vary a lot and motivation/quick wins help.
  const aprs = params.debts.map((d) => d.apr);
  const aprSpread = aprs.length ? Math.max(...aprs) - Math.min(...aprs) : 0;
  const recommendedStrategy: Strategy = aprSpread >= 5 ? "avalanche" : "snowball";
  const recommendationReason =
    aprSpread >= 5
      ? "Your interest rates vary a lot, so the avalanche method (highest APR first) saves you the most money."
      : "Your rates are similar, so the snowball method (smallest balance first) gives you faster wins to stay motivated — with almost no extra cost.";

  const strategy = params.strategy ?? recommendedStrategy;
  const plan = simulatePayoff(params.debts, extraToDebt, strategy);
  // Baseline: minimums only (no extra), avalanche ordering is irrelevant since
  // no extra is applied, but we keep a consistent order.
  const baseline = simulatePayoff(params.debts, 0, strategy);

  return {
    disposableIncome,
    extraToDebt,
    strategy,
    plan,
    baseline,
    interestSaved: Math.max(0, baseline.totalInterest - plan.totalInterest),
    monthsSaved: Math.max(0, baseline.months - plan.months),
    recommendedStrategy,
    recommendationReason,
  };
}

export function formatDuration(months: number): string {
  if (months >= MAX_MONTHS) return "60+ years";
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} mo`;
  if (m === 0) return `${y} yr`;
  return `${y} yr ${m} mo`;
}

/**
 * Budget model for the free advisor. Turns a categorized monthly budget into
 * disposable income and surfaces "found money" — discretionary spending that
 * could be redirected to debt payoff.
 */

export interface ExpenseCategory {
  key: string;
  label: string;
  discretionary: boolean;
  /** Typical share of take-home, used only to prefill sensible starting values. */
  typicalShare: number;
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { key: "housing", label: "Housing (rent / mortgage)", discretionary: false, typicalShare: 0.3 },
  { key: "utilities", label: "Utilities & phone", discretionary: false, typicalShare: 0.07 },
  { key: "transport", label: "Transportation & gas", discretionary: false, typicalShare: 0.1 },
  { key: "groceries", label: "Groceries", discretionary: false, typicalShare: 0.1 },
  { key: "insurance", label: "Insurance", discretionary: false, typicalShare: 0.06 },
  { key: "healthcare", label: "Healthcare", discretionary: false, typicalShare: 0.04 },
  { key: "dining", label: "Dining out & takeout", discretionary: true, typicalShare: 0.06 },
  { key: "subscriptions", label: "Subscriptions & memberships", discretionary: true, typicalShare: 0.02 },
  { key: "shopping", label: "Shopping & personal", discretionary: true, typicalShare: 0.05 },
  { key: "entertainment", label: "Entertainment & hobbies", discretionary: true, typicalShare: 0.03 },
  { key: "other", label: "Everything else", discretionary: false, typicalShare: 0.05 },
];

export type Budget = Record<string, number>;

export function seedBudget(income: number): Budget {
  const b: Budget = {};
  for (const c of EXPENSE_CATEGORIES) b[c.key] = Math.round((income * c.typicalShare) / 5) * 5;
  return b;
}

export function totalExpenses(budget: Budget): number {
  return EXPENSE_CATEGORIES.reduce((s, c) => s + (budget[c.key] || 0), 0);
}

export function discretionaryTotal(budget: Budget): number {
  return EXPENSE_CATEGORIES.filter((c) => c.discretionary).reduce((s, c) => s + (budget[c.key] || 0), 0);
}

/** A gentle "found money" suggestion: redirect half of discretionary spend. */
export function foundMoney(budget: Budget): { discretionary: number; redirectable: number } {
  const discretionary = discretionaryTotal(budget);
  return { discretionary, redirectable: Math.round(discretionary / 2) };
}

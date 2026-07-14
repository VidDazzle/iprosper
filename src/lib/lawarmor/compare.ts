/**
 * Law & Armor comparison engine. Compares multiple offers/contracts of the same
 * kind (competing insurance quotes, home-purchase offers, realtor listing
 * agreements, or any contract) across the dimensions that matter, scores each
 * objectively, and ranks best → worst WITH REASONS.
 *
 * Guardrails: this is unbiased consumer information, NOT legal advice and NOT a
 * recommendation. It reports which option scores highest/lowest on measurable
 * terms and why — it never tells the customer which one to choose.
 */

import { ADVOCATE_STANCE } from "@/lib/advocacy";

export type CompareDir = "higher" | "lower";

export interface CompareMetric {
  key: string;
  label: string;
  dir: CompareDir; // which direction is better for the consumer
  unit: "usd" | "pct" | "days" | "months" | "score"; // score = 1–10
  weight: number; // relative importance (need not sum to 1)
  help?: string;
}

export interface CompareProfile {
  id: string;
  label: string;
  note: string;
  metrics: CompareMetric[];
}

export const COMPARE_PROFILES: CompareProfile[] = [
  {
    id: "insurance",
    label: "Insurance offers (home / auto / renters)",
    note: "Compare competing insurance quotes for the same coverage.",
    metrics: [
      { key: "premium", label: "Monthly premium", dir: "lower", unit: "usd", weight: 3 },
      { key: "deductible", label: "Deductible", dir: "lower", unit: "usd", weight: 2, help: "What you pay out of pocket per claim" },
      { key: "coverage", label: "Coverage limit", dir: "higher", unit: "usd", weight: 3 },
      { key: "service", label: "Service / claims rating", dir: "higher", unit: "score", weight: 1, help: "1–10, from reviews or your own read" },
    ],
  },
  {
    id: "home_offer",
    label: "Home-purchase offers (seller comparing offers)",
    note: "Compare offers you've received on a home you're selling.",
    metrics: [
      { key: "amount", label: "Offer amount", dir: "higher", unit: "usd", weight: 3 },
      { key: "contingencies", label: "Number of contingencies", dir: "lower", unit: "score", weight: 2, help: "Financing, inspection, appraisal, sale-of-home, etc." },
      { key: "days", label: "Days to close", dir: "lower", unit: "days", weight: 2 },
      { key: "financing", label: "Financing strength", dir: "higher", unit: "score", weight: 2, help: "1–10: cash = 10, pre-approved lower, etc." },
    ],
  },
  {
    id: "listing",
    label: "Realtor listing agreements",
    note: "Compare listing agreements from different agents/brokerages.",
    metrics: [
      { key: "commission", label: "Total commission", dir: "lower", unit: "pct", weight: 3 },
      { key: "term", label: "Listing term", dir: "lower", unit: "months", weight: 2, help: "How long you're locked in" },
      { key: "marketing", label: "Marketing & services", dir: "higher", unit: "score", weight: 2 },
      { key: "cancel", label: "Ease of cancellation", dir: "higher", unit: "score", weight: 1, help: "1–10: easy to exit = higher" },
    ],
  },
  {
    id: "contract",
    label: "Any contract / agreement",
    note: "Compare competing contracts (service, financing, warranty, etc.).",
    metrics: [
      { key: "cost", label: "Total cost", dir: "lower", unit: "usd", weight: 3 },
      { key: "length", label: "Contract length", dir: "lower", unit: "months", weight: 2 },
      { key: "flexibility", label: "Flexibility / exit terms", dir: "higher", unit: "score", weight: 2, help: "1–10: easy to change or cancel = higher" },
      { key: "penalties", label: "Fees & penalties", dir: "lower", unit: "score", weight: 2, help: "1–10: more/steeper penalties = higher number" },
    ],
  },
];

export interface CompareOption { name: string; values: Record<string, number> }

export interface ScoredOption {
  name: string;
  score: number; // 0–100
  pros: string[];
  cons: string[];
  perMetric: { key: string; normalized: number; best: boolean; worst: boolean }[];
}

export interface CompareResult {
  profileLabel: string;
  ranked: ScoredOption[];
  best: { name: string; reasons: string[] };
  worst: { name: string; reasons: string[] };
  metrics: CompareMetric[];
  matrix: { metric: string; unit: string; cells: { name: string; value: number; best: boolean; worst: boolean }[] }[];
  disclaimer: string;
}

export function fmt(v: number, unit: CompareMetric["unit"]): string {
  switch (unit) {
    case "usd": return "$" + Math.round(v).toLocaleString("en-US");
    case "pct": return `${v}%`;
    case "days": return `${v} days`;
    case "months": return `${v} mo`;
    case "score": return `${v}/10`;
  }
}

export function getProfile(id: string): CompareProfile | undefined {
  return COMPARE_PROFILES.find((p) => p.id === id);
}

export function compare(profileId: string, options: CompareOption[]): CompareResult | null {
  const profile = getProfile(profileId);
  if (!profile || options.length < 2) return null;

  const totalWeight = profile.metrics.reduce((s, m) => s + m.weight, 0);

  // Per-metric min/max and per-option normalized (best value → 1).
  const norm: Record<string, Record<string, number>> = {};
  const bestVal: Record<string, number> = {};
  const worstVal: Record<string, number> = {};
  for (const m of profile.metrics) {
    const vals = options.map((o) => o.values[m.key] ?? 0);
    const min = Math.min(...vals), max = Math.max(...vals);
    const better = m.dir === "higher" ? max : min;
    const worse = m.dir === "higher" ? min : max;
    bestVal[m.key] = better; worstVal[m.key] = worse;
    norm[m.key] = {};
    for (const o of options) {
      const v = o.values[m.key] ?? 0;
      let n = 0.5;
      if (max !== min) n = m.dir === "higher" ? (v - min) / (max - min) : (max - v) / (max - min);
      norm[m.key][o.name] = n;
    }
  }

  const scored: ScoredOption[] = options.map((o) => {
    const perMetric = profile.metrics.map((m) => {
      const v = o.values[m.key] ?? 0;
      return { key: m.key, normalized: norm[m.key][o.name], best: v === bestVal[m.key], worst: v === worstVal[m.key] && bestVal[m.key] !== worstVal[m.key] };
    });
    const score = Math.round(
      (profile.metrics.reduce((s, m) => s + m.weight * norm[m.key][o.name], 0) / totalWeight) * 100
    );
    const pros: string[] = [];
    const cons: string[] = [];
    for (const m of profile.metrics) {
      const v = o.values[m.key] ?? 0;
      if (v === bestVal[m.key] && bestVal[m.key] !== worstVal[m.key]) pros.push(`Best ${m.label.toLowerCase()} (${fmt(v, m.unit)})`);
      if (v === worstVal[m.key] && bestVal[m.key] !== worstVal[m.key]) cons.push(`Weakest ${m.label.toLowerCase()} (${fmt(v, m.unit)})`);
    }
    return { name: o.name, score, pros, cons, perMetric };
  });

  const ranked = [...scored].sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const worst = ranked[ranked.length - 1];

  const matrix = profile.metrics.map((m) => ({
    metric: m.label, unit: m.unit,
    cells: options.map((o) => {
      const v = o.values[m.key] ?? 0;
      return { name: o.name, value: v, best: v === bestVal[m.key] && bestVal[m.key] !== worstVal[m.key], worst: v === worstVal[m.key] && bestVal[m.key] !== worstVal[m.key] };
    }),
  }));

  return {
    profileLabel: profile.label,
    ranked,
    best: { name: best.name, reasons: best.pros.length ? best.pros : ["Highest overall score across the weighted measures"] },
    worst: { name: worst.name, reasons: worst.cons.length ? worst.cons : ["Lowest overall score across the weighted measures"] },
    metrics: profile.metrics,
    matrix,
    disclaimer:
      "This is an objective comparison of the terms you entered. Scores reflect only the measures shown and the weights we assign them; which option is right depends on your priorities, and we never tell you which to choose. " +
      ADVOCATE_STANCE,
  };
}

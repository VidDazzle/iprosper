import { describe, it, expect } from "vitest";
import { compare } from "./compare";

describe("compare", () => {
  const options = [
    { name: "Acme", values: { premium: 140, deductible: 1000, coverage: 300000, service: 8 } },
    { name: "Beta", values: { premium: 120, deductible: 2500, coverage: 250000, service: 6 } },
    { name: "Gamma", values: { premium: 160, deductible: 500, coverage: 400000, service: 9 } },
  ];

  it("ranks by score descending with scores bounded 0..100", () => {
    const r = compare("insurance", options)!;
    expect(r).not.toBeNull();
    const scores = r.ranked.map((o) => o.score);
    for (let i = 1; i < scores.length; i++) expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
    for (const s of scores) { expect(s).toBeGreaterThanOrEqual(0); expect(s).toBeLessThanOrEqual(100); }
  });

  it("best and worst differ and each carry reasons", () => {
    const r = compare("insurance", options)!;
    expect(r.best.name).not.toBe(r.worst.name);
    expect(r.best.reasons.length).toBeGreaterThan(0);
    expect(r.worst.reasons.length).toBeGreaterThan(0);
  });

  it("carries the consumer-advocate stance in the disclaimer (no recommendation)", () => {
    const r = compare("insurance", options)!;
    expect(r.disclaimer).toMatch(/we do not make recommendations/i);
    expect(r.disclaimer).toMatch(/never tell you which to choose/i);
  });

  it("returns null for unknown profile or too few options", () => {
    expect(compare("nope", options)).toBeNull();
    expect(compare("insurance", options.slice(0, 1))).toBeNull();
  });
});

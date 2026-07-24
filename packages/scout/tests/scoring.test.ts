import { describe, it, expect } from "vitest";
import { capConfidenceToEvidence, computeScore, infraReusePenalty, scoreCandidate } from "../src/scoring.js";

describe("capConfidenceToEvidence", () => {
  it("caps high confidence to low when the basis is too thin", () => {
    const result = capConfidenceToEvidence("high", "seems promising");
    expect(result.confidence).toBe("low");
    expect(result.capped).toBe(true);
  });

  it("caps med confidence to low when the basis has no evidentiary keyword", () => {
    const result = capConfidenceToEvidence("med", "I have a really good feeling about this one honestly");
    expect(result.confidence).toBe("low");
    expect(result.capped).toBe(true);
  });

  it("leaves confidence alone when the basis references comparables/data/historical APEX performance", () => {
    const result = capConfidenceToEvidence(
      "high",
      "Based on 3 comparable APEX rebrand-engine launches with historical conversion data",
    );
    expect(result.confidence).toBe("high");
    expect(result.capped).toBe(false);
  });

  it("never caps confidence that's already low", () => {
    const result = capConfidenceToEvidence("low", "just a hunch");
    expect(result.confidence).toBe("low");
    expect(result.capped).toBe(false);
  });
});

describe("infraReusePenalty", () => {
  it("is highest with no reusable infra", () => {
    expect(infraReusePenalty([])).toBeGreaterThan(infraReusePenalty(["packages/pipeline"]));
  });

  it("floors at 0 rather than going negative", () => {
    const manyReuses = Array.from({ length: 20 }, (_, i) => `infra-${i}`);
    expect(infraReusePenalty(manyReuses)).toBe(0);
  });
});

describe("computeScore", () => {
  it("scores higher for higher confidence, all else equal", () => {
    const base = { estRevenueMonthly: 1000, estBuildHours: 40, infraReuse: [] };
    const low = computeScore({ ...base, confidence: "low" });
    const high = computeScore({ ...base, confidence: "high" });
    expect(high).toBeGreaterThan(low);
  });

  it("scores higher for more infra reuse, all else equal", () => {
    const base = { estRevenueMonthly: 1000, estBuildHours: 40, confidence: "med" as const };
    const noReuse = computeScore({ ...base, infraReuse: [] });
    const withReuse = computeScore({ ...base, infraReuse: ["packages/pipeline", "packages/renderer"] });
    expect(withReuse).toBeGreaterThan(noReuse);
  });

  it("never divides by zero even with extreme inputs", () => {
    expect(() => computeScore({ estRevenueMonthly: 1000, confidence: "high", estBuildHours: 0, infraReuse: Array(20).fill("x") })).not.toThrow();
  });
});

describe("scoreCandidate", () => {
  it("applies the evidence cap before scoring — an unsupported 'high' claim scores as if it were 'low'", () => {
    const supported = scoreCandidate({
      name: "A",
      category: "new-vertical",
      estRevenueMonthly: 1000,
      confidence: "high",
      confidenceBasis: "Based on comparable APEX historical data across 5 launches",
      estBuildHours: 40,
      infraReuse: [],
      complianceFlags: [],
    });
    const unsupported = scoreCandidate({
      name: "B",
      category: "new-vertical",
      estRevenueMonthly: 1000,
      confidence: "high",
      confidenceBasis: "trust me",
      estBuildHours: 40,
      infraReuse: [],
      complianceFlags: [],
    });

    expect(unsupported.wasCapped).toBe(true);
    expect(unsupported.confidence).toBe("low");
    expect(unsupported.score).toBeLessThan(supported.score);
  });
});

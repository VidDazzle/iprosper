import { describe, it, expect } from "vitest";
import { analyzeCoverage } from "./coverage";

const forbidden = /you are covered|definitely covered|guaranteed|yes,? (it|you)('|’)?s? covered/i;

describe("analyzeCoverage", () => {
  it("returns HIGH when a sudden covered peril matches policy language with no exclusion", () => {
    const r = analyzeCoverage({
      domain: "homeowner",
      question: "My roof was damaged by a windstorm last week and rain leaked into the ceiling.",
      policyText: "We insure against sudden and accidental direct physical loss caused by windstorm and hail. This policy does not cover loss caused by flood or earthquake.",
    });
    expect(r.band).toBe("high");
    expect(r.supporting.length).toBeGreaterThan(0);
  });

  it("returns LOW for gradual wear / seepage (excluded)", () => {
    const r = analyzeCoverage({
      domain: "homeowner",
      question: "My roof has been slowly leaking for months from wear and tear and age.",
      policyText: "We do not cover loss caused by wear and tear, deterioration, or constant or repeated seepage of water.",
    });
    expect(r.band).toBe("low");
  });

  it("returns INSUFFICIENT and asks follow-ups when facts are thin and no policy text", () => {
    const r = analyzeCoverage({ domain: "auto", question: "Is my car covered?" });
    expect(r.band).toBe("insufficient");
    expect(r.followUps.length).toBeGreaterThan(0);
  });

  it("NEVER states the consumer is covered, in any field", () => {
    const r = analyzeCoverage({
      domain: "homeowner",
      question: "roof damaged by windstorm",
      policyText: "We cover windstorm and hail.",
    });
    const blob = JSON.stringify(r).toLowerCase();
    expect(forbidden.test(blob)).toBe(false);
    expect(r.disclaimer).toMatch(/do not act|not a coverage decision/i);
  });

  it("high requires policy text: a covered cause with no document stays below high", () => {
    const r = analyzeCoverage({ domain: "homeowner", question: "fire damaged my kitchen yesterday" });
    expect(r.band).not.toBe("high");
  });
});

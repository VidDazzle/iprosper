import { describe, it, expect } from "vitest";
import { auditBill } from "./audit";

describe("auditBill", () => {
  it("flags duplicates, quantity anomalies, unbundling, upcoding, vague charges", () => {
    const r = auditBill(
      [
        { code: "99285", description: "ER visit level 5", units: 1, charge: 2400 },
        { description: "Room and board", units: 3, charge: 9000 },
        { description: "Comprehensive metabolic panel", units: 1, charge: 220 },
        { description: "Glucose", units: 1, charge: 45 },
        { description: "Potassium", units: 1, charge: 40 },
        { description: "Sodium", units: 1, charge: 40 },
        { description: "Miscellaneous supplies", units: 1, charge: 350 },
        { code: "J1200", description: "Ibuprofen 800mg", units: 2, charge: 60 },
        { code: "J1200", description: "Ibuprofen 800mg", units: 2, charge: 60 },
      ],
      { emergency: true, eobPatientResponsibility: 1500 }
    );
    const titles = r.flags.map((f) => f.title).join(" | ");
    expect(titles).toMatch(/duplicate/i);
    expect(titles).toMatch(/quantity/i);
    expect(titles).toMatch(/unbundling/i);
    expect(titles).toMatch(/high-level/i);
    expect(titles).toMatch(/vague/i);
    expect(titles).toMatch(/no surprises act/i);
  });

  it("keeps estimated savings within [0, total] and low <= high (the double-count bug)", () => {
    const r = auditBill(
      [
        { code: "99285", description: "ER visit level 5", units: 1, charge: 2400 },
        { description: "Room and board", units: 3, charge: 9000 },
        { code: "J1200", description: "Ibuprofen", units: 1, charge: 60 },
        { code: "J1200", description: "Ibuprofen", units: 1, charge: 60 },
      ],
      { eobPatientResponsibility: 1500 }
    );
    expect(r.estimatedSavings.low).toBeGreaterThanOrEqual(0);
    expect(r.estimatedSavings.low).toBeLessThanOrEqual(r.estimatedSavings.high);
    expect(r.estimatedSavings.high).toBeLessThanOrEqual(r.totalCharged);
  });

  it("produces zero flags and a graceful dispute summary for a clean bill", () => {
    const r = auditBill([{ code: "99213", description: "Office visit", units: 1, charge: 150 }], {});
    expect(r.flags.length).toBe(0);
    expect(r.disputeSummary).toMatch(/billing department/i);
  });

  it("totalCharged sums the lines", () => {
    const r = auditBill([{ description: "A", units: 1, charge: 100 }, { description: "B", units: 1, charge: 50 }], {});
    expect(r.totalCharged).toBe(150);
  });
});

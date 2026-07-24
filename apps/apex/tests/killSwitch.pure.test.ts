import { describe, it, expect } from "vitest";
import { computeRollingWindows, shouldAutoKill } from "../src/killSwitch.js";

describe("computeRollingWindows", () => {
  it("aggregates spend and revenue per agent", () => {
    const jobs = [
      { agentId: "a1", costToDate: 10, revenueAttributed: 5 },
      { agentId: "a1", costToDate: 20, revenueAttributed: 0 },
      { agentId: "a2", costToDate: 5, revenueAttributed: 50 },
    ];
    const windows = computeRollingWindows(jobs);
    const a1 = windows.find((w) => w.agentId === "a1")!;
    const a2 = windows.find((w) => w.agentId === "a2")!;
    expect(a1.spend).toBe(30);
    expect(a1.revenue).toBe(5);
    expect(a2.spend).toBe(5);
    expect(a2.revenue).toBe(50);
  });
});

describe("shouldAutoKill", () => {
  it("fires when spend exceeds revenue", () => {
    expect(shouldAutoKill({ agentId: "a1", spend: 100, revenue: 50 })).toBe(true);
  });

  it("does not fire when revenue meets or exceeds spend", () => {
    expect(shouldAutoKill({ agentId: "a1", spend: 100, revenue: 100 })).toBe(false);
    expect(shouldAutoKill({ agentId: "a1", spend: 50, revenue: 100 })).toBe(false);
  });
});

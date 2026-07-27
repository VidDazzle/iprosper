import { describe, it, expect } from "vitest";
import { decideRebalance, type EnginePriorState, type EngineWeekActual } from "../src/rebalance.js";

const balancedPrior: EnginePriorState[] = [
  { engine: "client-acquisition", status: "balanced", consecutiveWinCycles: 0, consecutiveMissCycles: 0 },
  { engine: "affiliate", status: "balanced", consecutiveWinCycles: 0, consecutiveMissCycles: 0 },
  { engine: "evolve", status: "balanced", consecutiveWinCycles: 0, consecutiveMissCycles: 0 },
];

describe("decideRebalance", () => {
  it("stays balanced with no clear winner", () => {
    const actuals: EngineWeekActual[] = [
      { engine: "client-acquisition", roi: 0.1 },
      { engine: "affiliate", roi: 0.09 },
      { engine: "evolve", roi: 0.08 },
    ];
    const result = decideRebalance(balancedPrior, actuals);
    expect(result.every((r) => r.status === "balanced" && r.weight === 1 / 3)).toBe(true);
  });

  it("does not concentrate after only one clearly-winning cycle", () => {
    const actuals: EngineWeekActual[] = [
      { engine: "client-acquisition", roi: 0.5 },
      { engine: "affiliate", roi: 0.1 },
      { engine: "evolve", roi: 0.05 },
    ];
    const result = decideRebalance(balancedPrior, actuals);
    expect(result.every((r) => r.status === "balanced")).toBe(true);
    const winner = result.find((r) => r.engine === "client-acquisition")!;
    expect(winner.consecutiveWinCycles).toBe(1);
  });

  it("concentrates after two consecutive clearly-winning cycles", () => {
    const priorWithOneWin: EnginePriorState[] = [
      { engine: "client-acquisition", status: "balanced", consecutiveWinCycles: 1, consecutiveMissCycles: 0 },
      { engine: "affiliate", status: "balanced", consecutiveWinCycles: 0, consecutiveMissCycles: 0 },
      { engine: "evolve", status: "balanced", consecutiveWinCycles: 0, consecutiveMissCycles: 0 },
    ];
    const actuals: EngineWeekActual[] = [
      { engine: "client-acquisition", roi: 0.5 },
      { engine: "affiliate", roi: 0.1 },
      { engine: "evolve", roi: 0.05 },
    ];
    const result = decideRebalance(priorWithOneWin, actuals);
    const winner = result.find((r) => r.engine === "client-acquisition")!;
    const others = result.filter((r) => r.engine !== "client-acquisition");

    expect(winner.status).toBe("concentrated");
    expect(winner.weight).toBeCloseTo(0.8);
    expect(others.every((o) => o.status === "heartbeat")).toBe(true);
    expect(others.every((o) => o.weight === 0.1)).toBe(true);
  });

  it("keeps a heartbeat floor of 10% on non-winning engines while concentrated", () => {
    const concentratedPrior: EnginePriorState[] = [
      { engine: "client-acquisition", status: "concentrated", consecutiveWinCycles: 0, consecutiveMissCycles: 0 },
      { engine: "affiliate", status: "heartbeat", consecutiveWinCycles: 0, consecutiveMissCycles: 0 },
      { engine: "evolve", status: "heartbeat", consecutiveWinCycles: 0, consecutiveMissCycles: 0 },
    ];
    const actuals: EngineWeekActual[] = [
      { engine: "client-acquisition", roi: 0.3 },
      { engine: "affiliate", roi: -0.5 },
      { engine: "evolve", roi: -0.5 },
    ];
    const result = decideRebalance(concentratedPrior, actuals);
    const heartbeats = result.filter((r) => r.engine !== "client-acquisition");
    expect(heartbeats.every((h) => h.status === "heartbeat" && h.weight === 0.1)).toBe(true);
  });

  it("does not revert after only one below-target cycle while concentrated", () => {
    const concentratedPrior: EnginePriorState[] = [
      { engine: "client-acquisition", status: "concentrated", consecutiveWinCycles: 0, consecutiveMissCycles: 0 },
      { engine: "affiliate", status: "heartbeat", consecutiveWinCycles: 0, consecutiveMissCycles: 0 },
      { engine: "evolve", status: "heartbeat", consecutiveWinCycles: 0, consecutiveMissCycles: 0 },
    ];
    const actuals: EngineWeekActual[] = [
      { engine: "client-acquisition", roi: -0.1 }, // below target (0)
      { engine: "affiliate", roi: 0.02 },
      { engine: "evolve", roi: 0.01 },
    ];
    const result = decideRebalance(concentratedPrior, actuals);
    const winner = result.find((r) => r.engine === "client-acquisition")!;
    expect(winner.status).toBe("concentrated");
    expect(winner.consecutiveMissCycles).toBe(1);
  });

  it("reverts to balanced after two consecutive below-target cycles while concentrated", () => {
    const concentratedPriorWithOneMiss: EnginePriorState[] = [
      { engine: "client-acquisition", status: "concentrated", consecutiveWinCycles: 0, consecutiveMissCycles: 1 },
      { engine: "affiliate", status: "heartbeat", consecutiveWinCycles: 0, consecutiveMissCycles: 0 },
      { engine: "evolve", status: "heartbeat", consecutiveWinCycles: 0, consecutiveMissCycles: 0 },
    ];
    const actuals: EngineWeekActual[] = [
      { engine: "client-acquisition", roi: -0.2 },
      { engine: "affiliate", roi: 0.01 },
      { engine: "evolve", roi: 0.02 },
    ];
    const result = decideRebalance(concentratedPriorWithOneMiss, actuals);
    expect(result.every((r) => r.status === "balanced" && r.weight === 1 / 3)).toBe(true);
    expect(result.every((r) => r.consecutiveMissCycles === 0 && r.consecutiveWinCycles === 0)).toBe(true);
  });

  it("resets miss streak when the concentrated engine wins again", () => {
    const concentratedPriorWithOneMiss: EnginePriorState[] = [
      { engine: "client-acquisition", status: "concentrated", consecutiveWinCycles: 0, consecutiveMissCycles: 1 },
      { engine: "affiliate", status: "heartbeat", consecutiveWinCycles: 0, consecutiveMissCycles: 0 },
      { engine: "evolve", status: "heartbeat", consecutiveWinCycles: 0, consecutiveMissCycles: 0 },
    ];
    const actuals: EngineWeekActual[] = [
      { engine: "client-acquisition", roi: 0.4 },
      { engine: "affiliate", roi: 0.01 },
      { engine: "evolve", roi: 0.02 },
    ];
    const result = decideRebalance(concentratedPriorWithOneMiss, actuals);
    const winner = result.find((r) => r.engine === "client-acquisition")!;
    expect(winner.status).toBe("concentrated");
    expect(winner.consecutiveMissCycles).toBe(0);
  });
});

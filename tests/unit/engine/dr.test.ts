import { describe, expect, it } from "vitest";
import { drEstimate, type LoggedDecision } from "@/engine/doublyRobust";

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

// Synthetic data: context x ~ U(0,1); true E[Y|a=1,x] = 0.3 + 0.4x, E[Y|a=0,x] = 0.5; policy picks a=1 with p = 0.2 + 0.6x.
function simulate(n: number, outcomeModelRight: boolean, propensityRight: boolean): LoggedDecision[] {
  const r = rng(42);
  return Array.from({ length: n }, () => {
    const x = r();
    const p = 0.2 + 0.6 * x;
    const action = (r() < p ? 1 : 0) as 0 | 1;
    const reward = r() < (action === 1 ? 0.3 + 0.4 * x : 0.5) ? 1 : 0;
    return { action, reward, propensity: propensityRight ? p : 0.5, m1: outcomeModelRight ? 0.3 + 0.4 * x : 0.9, m0: outcomeModelRight ? 0.5 : 0.1 };
  });
}

describe("doubly robust estimate (dr)", () => {
  it("recovers the true value (0.5 for each action) when either model is right", () => {
    for (const [om, pr] of [[true, true], [true, false], [false, true]] as const) {
      const rows = simulate(40000, om, pr);
      expect(drEstimate(rows, 1)).toBeCloseTo(0.5, 1);
      expect(drEstimate(rows, 0)).toBeCloseTo(0.5, 1);
    }
  });

  it("rejects empty logs and degenerate propensities", () => {
    expect(() => drEstimate([], 1)).toThrow(RangeError);
    expect(() => drEstimate([{ action: 1, reward: 1, propensity: 1, m0: 0, m1: 0 }], 1)).toThrow(RangeError);
  });
});

import { describe, expect, it } from "vitest";
import { createChaseModel, next, OUTCOMES, swing, terminal, type ChaseState, type OutcomeDist } from "@/engine/chaseWp";

// Synthetic outcome models for testing the maths (not fitted to any data).
const flat: OutcomeDist = { 0: 0.35, 1: 0.33, 2: 0.08, 3: 0.01, 4: 0.1, 5: 0, 6: 0.08, W: 0.05 };
const deathy = (s: ChaseState): OutcomeDist => (s.b <= 24 ? { 0: 0.3, 1: 0.3, 2: 0.08, 3: 0, 4: 0.12, 5: 0, 6: 0.12, W: 0.08 } : flat);

describe("exact chase win probability (wp)", () => {
  const m = createChaseModel(deathy);

  it("terminal states: win, loss, tie = 0.5", () => {
    expect(terminal({ b: 10, w: 3, r: 0 })).toBe(1);
    expect(terminal({ b: 10, w: 0, r: 5 })).toBe(0);
    expect(terminal({ b: 0, w: 3, r: 2 })).toBe(0);
    expect(terminal({ b: 0, w: 3, r: 1 })).toBe(0.5);
    expect(terminal({ b: 1, w: 1, r: 1 })).toBeNull();
    expect(m.wp({ b: 0, w: 5, r: 1 })).toBe(0.5);
    expect(m.wp({ b: 6, w: 1, r: -3 })).toBe(1);
  });

  it("is monotonic: more runs needed → lower; more wickets or balls → higher", () => {
    for (let r = 1; r < 80; r++) expect(m.wp({ b: 36, w: 5, r })).toBeGreaterThanOrEqual(m.wp({ b: 36, w: 5, r: r + 1 }));
    for (let w = 1; w < 10; w++) expect(m.wp({ b: 36, w: w + 1, r: 50 })).toBeGreaterThanOrEqual(m.wp({ b: 36, w, r: 50 }));
    for (let b = 1; b < 60; b++) expect(m.wp({ b: b + 1, w: 5, r: 60 })).toBeGreaterThanOrEqual(m.wp({ b, w: 5, r: 60 }));
  });

  it("is a martingale: expected next-ball WP equals current WP within 1e-9", () => {
    const states: ChaseState[] = [{ b: 120, w: 10, r: 170 }, { b: 30, w: 4, r: 45 }, { b: 6, w: 2, r: 11 }, { b: 1, w: 1, r: 4 }];
    for (const s of states) {
      const d = deathy(s);
      const expected = OUTCOMES.reduce<number>((acc, o) => acc + d[o] * m.wp(next(s, o)), 0);
      expect(Math.abs(expected - m.wp(s))).toBeLessThan(1e-9);
    }
  });

  it("leverage is the std dev of next-ball WP, zero at terminal states, higher at the death than early", () => {
    expect(m.leverage({ b: 0, w: 3, r: 4 })).toBe(0);
    const early = m.leverage({ b: 114, w: 10, r: 150 });
    const death = m.leverage({ b: 6, w: 3, r: 10 });
    expect(death).toBeGreaterThan(3 * early);
    expect(swing(0.28, 0.71)).toBeCloseTo(0.43, 12);
  });

  it("rejects invalid states and distributions", () => {
    expect(() => m.wp({ b: -1, w: 3, r: 4 })).toThrow(RangeError);
    expect(() => m.leverage({ b: 1.5, w: 3, r: 4 })).toThrow(RangeError);
    expect(() => createChaseModel(() => ({ ...flat, W: 0.5 })).wp({ b: 6, w: 2, r: 8 })).toThrow(/sum to 1/);
    expect(() => createChaseModel(() => ({ ...flat, 0: -0.1, 1: 0.78 })).wp({ b: 6, w: 2, r: 8 })).toThrow(/non-negative/);
  });
});

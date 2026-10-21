import { describe, expect, it } from "vitest";
import { brier, grade } from "@/engine/grader";

describe("grader", () => {
  it("read points = WP(pick) − best other, in points", () => {
    expect(grade({ pace: 0.63, spin: 0.58 }, "pace")).toEqual({ readPoints: expect.closeTo(5, 9), coinFlip: false, best: "pace" });
    expect(grade({ pace: 0.63, spin: 0.58 }, "spin").readPoints).toBeCloseTo(-5, 9);
    expect(grade({ a: 0.4, b: 0.5, c: 0.45 }, "c").readPoints).toBeCloseTo(-5, 9);
  });

  it("coin flip — no grade when the top two are within 2 points", () => {
    expect(grade({ pace: 0.6, spin: 0.59 }, "spin").coinFlip).toBe(true);
    expect(grade({ pace: 0.6, spin: 0.57 }, "spin").coinFlip).toBe(false);
  });

  it("rejects bad inputs", () => {
    expect(() => grade({ a: 0.5 }, "a")).toThrow(/two options/);
    expect(() => grade({ a: 0.5, b: 0.4 }, "c")).toThrow(/unknown option/);
    expect(() => grade({ a: 1.5, b: 0.4 }, "a")).toThrow(/\[0, 1\]/);
  });

  it("Brier: 0.7 and didn't happen gives 0.49", () => {
    expect(brier(0.7, 0)).toBeCloseTo(0.49, 12);
    expect(brier(0.99, 1)).toBeCloseTo(0.0001, 12);
    expect(() => brier(0.4, 1)).toThrow(RangeError);
  });
});

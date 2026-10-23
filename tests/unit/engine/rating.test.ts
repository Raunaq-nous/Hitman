import { describe, expect, it } from "vitest";
import { actualScore, expectedScore, FLOOR, momentDifficulty, START, updateRating } from "@/engine/readRating";

describe("Read Rating", () => {
  it("starts at 1200; K = 40 for the first 20 graded calls, then 24", () => {
    expect(START).toBe(1200);
    expect(updateRating(1200, 0, 1200, 10).k).toBe(40);
    expect(updateRating(1200, 19, 1200, 10).k).toBe(40);
    expect(updateRating(1200, 20, 1200, 10).k).toBe(24);
  });

  it("is monotonic: better reads and harder moments earn more", () => {
    const at = (pts: number, d = 1200) => updateRating(1200, 5, d, pts).rating;
    for (let p = -20; p < 20; p += 2) expect(at(p + 2)).toBeGreaterThanOrEqual(at(p));
    expect(at(10, 1400)).toBeGreaterThan(at(10, 1000));
    expect(updateRating(1200, 5, 1200, 0).rating).toBeCloseTo(1200, 9);
  });

  it("is bounded: never below the floor; scores clamp to [0, 1]", () => {
    expect(updateRating(110, 30, 110, -50).rating).toBe(FLOOR);
    expect([actualScore(100), actualScore(-100), actualScore(0)]).toEqual([1, 0, 0.5]);
    expect(expectedScore(1200, 1200)).toBe(0.5);
  });

  it("moment difficulty rises with leverage and falls with a wide option gap; moments update slowly", () => {
    expect(momentDifficulty(1, 0.95)).toBeGreaterThan(momentDifficulty(15, 0.95));
    expect(momentDifficulty(5, 0.95)).toBeGreaterThan(momentDifficulty(5, 0.2));
    expect(() => momentDifficulty(5, 2)).toThrow(RangeError);
    const u = updateRating(1200, 5, 1200, 20);
    expect(1200 - u.difficulty).toBeCloseTo(8 * u.weight * (u.actual - u.expected), 12);
    expect(() => updateRating(1200, -1, 1200, 0)).toThrow(RangeError);
  });

  it("the read decides the direction: a wrong pick never gains and the best pick never loses, however hard the moment", () => {
    for (const d of [400, 1000, 1200, 1600, 2400]) for (const r of [300, 1200, 2000]) for (const pts of [0.5, 3, 19, 40]) {
      expect(updateRating(r, 5, d, -pts).rating, `${r} ${d} -${pts}`).toBeLessThanOrEqual(r);
      expect(updateRating(r, 5, d, pts).rating, `${r} ${d} +${pts}`).toBeGreaterThanOrEqual(r);
    }
    // a near tie moves the rating far less than a clear read
    expect(Math.abs(updateRating(1200, 5, 1200, 0.5).rating - 1200)).toBeLessThan(Math.abs(updateRating(1200, 5, 1200, 10).rating - 1200));
  });
});

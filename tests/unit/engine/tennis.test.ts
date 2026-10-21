import { describe, expect, it } from "vitest";
import { holdProbability, matchWinProbability, pointImportance, pressureIndex, tiebreakServerIsFirst, tiebreakWinA, type TennisModel, type TennisState } from "@/engine/tennis";

const EVEN: TennisModel = { pA: 0.65, pB: 0.65, bestOf: 3 };
const start: TennisState = { setsA: 0, setsB: 0, gamesA: 0, gamesB: 0, pointsA: 0, pointsB: 0, serverA: true };

describe("tennis: iid point model", () => {
  it("p = 0.65 gives hold ≈ 0.83", () => {
    expect(holdProbability(0.65)).toBeCloseTo(0.83, 2);
    expect(holdProbability(0.5)).toBeCloseTo(0.5, 12);
  });

  it("handles game points, deuce and advantages", () => {
    expect(holdProbability(0.6, 4, 2)).toBe(1);
    expect(holdProbability(0.6, 1, 4)).toBe(0);
    const d = 0.36 / (0.36 + 0.16);
    expect(holdProbability(0.6, 3, 3)).toBeCloseTo(d, 12);
    expect(holdProbability(0.6, 4, 3)).toBeCloseTo(0.6 + 0.4 * d, 12);
    expect(holdProbability(0.6, 3, 4)).toBeCloseTo(0.6 * d, 12);
    expect(() => holdProbability(1)).toThrow(RangeError);
  });

  it("tiebreak serve order and probabilities", () => {
    expect([0, 1, 2, 3, 4, 5].map(tiebreakServerIsFirst)).toEqual([true, false, false, true, true, false]);
    expect(tiebreakWinA(EVEN, 0, 0, true)).toBeCloseTo(0.5, 9);
    expect(tiebreakWinA(EVEN, 7, 5, true)).toBe(1);
    expect(tiebreakWinA(EVEN, 4, 7, true)).toBe(0);
    expect(tiebreakWinA(EVEN, 6, 6, true)).toBeCloseTo(0.5, 9);
    expect(tiebreakWinA({ pA: 0.7, pB: 0.6, bestOf: 3 }, 6, 6, false)).toBeGreaterThan(0.5);
  });

  it("match win probability is symmetric for equal players and favours the stronger server", () => {
    expect(matchWinProbability(EVEN, start)).toBeCloseTo(0.5, 9);
    expect(matchWinProbability({ ...EVEN, bestOf: 5 }, start)).toBeCloseTo(0.5, 9);
    expect(matchWinProbability({ pA: 0.68, pB: 0.62, bestOf: 3 }, start)).toBeGreaterThan(0.7);
    expect(matchWinProbability(EVEN, { ...start, setsA: 1, gamesA: 5, gamesB: 3, pointsA: 3 })).toBeGreaterThan(0.95);
  });

  it("covers tiebreak states, set wins at 7-5 and invalid states", () => {
    const tb = matchWinProbability(EVEN, { ...start, setsA: 1, setsB: 1, gamesA: 6, gamesB: 6, pointsA: 6, pointsB: 5 });
    expect(tb).toBeGreaterThan(0.5);
    expect(matchWinProbability(EVEN, { ...start, gamesA: 6, gamesB: 5, pointsA: 3 })).toBeGreaterThan(0.5);
    expect(() => matchWinProbability(EVEN, { ...start, setsA: 2 })).toThrow(RangeError);
    expect(() => matchWinProbability(EVEN, { ...start, pointsA: -1 })).toThrow(RangeError);
    expect(() => matchWinProbability({ ...EVEN, pA: 0 }, start)).toThrow(RangeError);
  });

  it("point importance is higher on big points than early points", () => {
    const early = pointImportance(EVEN, start);
    const breakPointLate = pointImportance(EVEN, { setsA: 1, setsB: 1, gamesA: 5, gamesB: 5, pointsA: 2, pointsB: 3, serverA: true });
    const matchPointTiebreak = pointImportance(EVEN, { setsA: 1, setsB: 1, gamesA: 6, gamesB: 6, pointsA: 6, pointsB: 6, serverA: true });
    expect(early).toBeGreaterThan(0);
    expect(early).toBeLessThan(0.05);
    expect(breakPointLate).toBeGreaterThan(5 * early);
    expect(matchPointTiebreak).toBeGreaterThan(0.4);
    expect(pointImportance(EVEN, { ...start, pointsA: 4, pointsB: 4 })).toBeCloseTo(pointImportance(EVEN, { ...start, pointsA: 3, pointsB: 3 }), 12);
  });

  it("Pressure Index is importance in percentage points", () => {
    const s: TennisState = { setsA: 1, setsB: 1, gamesA: 6, gamesB: 6, pointsA: 6, pointsB: 6, serverA: true };
    expect(pressureIndex(EVEN, s)).toBe(Math.round(pointImportance(EVEN, s) * 100));
    expect(pressureIndex(EVEN, start)).toBeLessThan(5);
  });
});

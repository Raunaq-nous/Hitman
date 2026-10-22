import { describe, expect, it } from "vitest";
import { createChaseModel, type OutcomeDist } from "@/engine/chaseWp";
import { fitLogistic, logistic, matchBrier, matchCalibrationTest, mergeBuckets, seededRandom, simulateChase, type MatchSample } from "@/engine/matchCalibration";

// Synthetic samples for testing the statistics (not match data).
function calibratedMatches(n: number, seed: number, shift = 0): MatchSample[] {
  const rand = seededRandom(seed);
  const out: MatchSample[] = [];
  for (let m = 0; m < n; m++) {
    const p = rand();
    const y = (rand() < p ? 1 : 0) as 0 | 1;
    // a few balls per match with predictions around the match's true probability
    for (let k = 0; k < 3; k++) out.push({ p: Math.min(1, Math.max(0, p + shift + (rand() - 0.5) * 0.02)), y, match: `m${m}` });
  }
  return out;
}

describe("match-level calibration (calibration)", () => {
  it("seededRandom is deterministic and uniform-ish", () => {
    const a = seededRandom(7), b = seededRandom(7);
    const xs = Array.from({ length: 1000 }, () => a());
    expect(Array.from({ length: 1000 }, () => b())).toEqual(xs);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThan(1);
    expect(xs.reduce((s, x) => s + x, 0) / xs.length).toBeCloseTo(0.5, 1);
  });

  it("merges adjacent 10-point bins until each bucket has enough distinct matches", () => {
    const s: MatchSample[] = [
      ...Array.from({ length: 5 }, (_, i) => ({ p: 0.05, y: 0 as const, match: `a${i}` })),
      ...Array.from({ length: 5 }, (_, i) => ({ p: 0.15, y: 0 as const, match: `b${i}` })),
      ...Array.from({ length: 12 }, (_, i) => ({ p: 0.55, y: 1 as const, match: `c${i}` })),
      ...Array.from({ length: 3 }, (_, i) => ({ p: 0.95, y: 1 as const, match: `d${i}` })),
    ];
    // 0–0.2 reaches 10 matches; 0.2–0.6 reaches 12; the 0.95 remainder (3 matches) joins the previous bucket
    expect(mergeBuckets(s, 10)).toEqual([{ lo: 0, hi: 0.2 }, { lo: 0.2, hi: 1 }]);
    // a match counts once however many balls it has in a bin
    expect(mergeBuckets([{ p: 0.1, y: 0, match: "x" }, { p: 0.1, y: 0, match: "x" }], 2)).toEqual([{ lo: 0, hi: 1 }]);
  });

  it("a calibrated model passes and a shifted one fails; intervals cover their mean predictions", () => {
    const ok = matchCalibrationTest(calibratedMatches(400, 3), { minMatches: 40, boot: 400 });
    expect(ok.matches).toBe(400);
    expect(ok.buckets.every((b) => b.matches >= 40)).toBe(true);
    expect(ok.ece).toBeLessThan(0.05);
    // 95% intervals: a calibrated model covers nearly every bucket (an occasional miss is expected by design)
    expect(ok.buckets.filter((b) => !b.covered).length).toBeLessThanOrEqual(1);
    const shifted = matchCalibrationTest(calibratedMatches(400, 3, 0.15), { minMatches: 40, boot: 400 });
    expect(shifted.pass).toBe(false);
    expect(shifted.buckets.some((b) => !b.covered) || shifted.ece > 0.05).toBe(true);
    // deterministic for a seed
    expect(matchCalibrationTest(calibratedMatches(400, 3), { minMatches: 40, boot: 400 })).toEqual(ok);
    expect(() => matchCalibrationTest([])).toThrow(RangeError);
  });

  it("every match counts once in a bucket and in the Brier score", () => {
    const heavy: MatchSample[] = [...Array.from({ length: 99 }, () => ({ p: 0.9, y: 1 as const, match: "long" })), { p: 0.9, y: 0, match: "short" }];
    const r = matchCalibrationTest(heavy, { minMatches: 1, boot: 50 });
    expect(r.buckets[0].observed).toBe(0.5);
    expect(r.buckets[0].balls).toBe(100);
    // a bucket held by one match is missing from some resamples; its interval comes from the resamples that hold it
    const lone: MatchSample[] = [...Array.from({ length: 30 }, (_, i) => ({ p: 0.1, y: 0 as const, match: `z${i}` })), { p: 0.95, y: 1, match: "lone" }];
    const two = matchCalibrationTest(lone, { minMatches: 1, boot: 200 });
    expect(two.buckets.at(-1)).toMatchObject({ matches: 1, observed: 1, ciLo: 1, ciHi: 1 });
    expect(matchBrier(heavy)).toBeCloseTo(((0.9 - 1) ** 2 + (0.9 - 0) ** 2) / 2, 12);
  });

  it("fits a one-feature logistic regression", () => {
    const rand = seededRandom(11);
    const xs = Array.from({ length: 4000 }, () => rand() * 20);
    const ys = xs.map((x) => (rand() < 1 / (1 + Math.exp(-(2 - 0.3 * x))) ? 1 : 0) as 0 | 1);
    const m = fitLogistic(xs, ys);
    expect(m.a).toBeCloseTo(2, 0);
    expect(m.b).toBeCloseTo(-0.3, 1);
    expect(logistic(m, 0)).toBeGreaterThan(logistic(m, 10));
    // degenerate input stops instead of dividing by zero
    expect(fitLogistic([1, 1], [0, 1])).toEqual({ a: 0, b: 0 });
  });

  it("simulated chases end in a result and the model's WP along them is a martingale in expectation", () => {
    const flat: OutcomeDist = { 0: 0.35, 1: 0.33, 2: 0.08, 3: 0.01, 4: 0.1, 5: 0, 6: 0.08, W: 0.05 };
    const m = createChaseModel(() => flat);
    const rand = seededRandom(5);
    let won = 0;
    const n = 4000, start = { b: 12, w: 3, r: 16 };
    for (let i = 0; i < n; i++) {
      const sim = simulateChase(m, start, rand);
      expect(sim.states[0]).toEqual(start);
      won += sim.won;
    }
    // the simulated win rate matches the model's starting WP (calibrated by construction)
    expect(Math.abs(won / n - m.wp(start))).toBeLessThan(0.03);
    // a tie on the last ball is settled by a coin
    const tie = createChaseModel(() => ({ ...flat, 0: 1, 1: 0, 2: 0, 3: 0, 4: 0, 6: 0, W: 0 }));
    const ties = Array.from({ length: 400 }, () => simulateChase(tie, { b: 1, w: 1, r: 1 }, rand).won);
    expect(ties.filter((x) => x === 1).length).toBeGreaterThan(150);
    expect(ties.filter((x) => x === 0).length).toBeGreaterThan(150);
  });
});

import { describe, expect, it } from "vitest";
import { createChaseModel, OUTCOMES, type OutcomeDist } from "@/engine/chaseWp";
import { bandOf, decide, fitOptionCounts, momentDecision, optionWp, shrinkToward, totalCount, zeroCounts, type OptionArtifact } from "@/engine/options";

// Synthetic distributions for testing the maths (not fitted to any data).
const flat: OutcomeDist = { 0: 0.35, 1: 0.33, 2: 0.08, 3: 0.01, 4: 0.1, 5: 0, 6: 0.08, W: 0.05 };
const attack: OutcomeDist = { 0: 0.3, 1: 0.25, 2: 0.07, 3: 0.01, 4: 0.15, 5: 0, 6: 0.14, W: 0.08 };
const block: OutcomeDist = { 0: 0.5, 1: 0.35, 2: 0.08, 3: 0.01, 4: 0.03, 5: 0, 6: 0.01, W: 0.02 };

describe("option-conditioned win probability (options)", () => {
  it("shrinks counts toward the prior in proportion to the sample size", () => {
    const c = zeroCounts();
    c[6] = 50; c[0] = 50;
    const s = shrinkToward(c, flat, 100);
    expect(OUTCOMES.reduce<number>((a, o) => a + s[o], 0)).toBeCloseTo(1, 12);
    expect(s[6]).toBeCloseTo((50 + 100 * 0.08) / 200, 12);
    expect(shrinkToward(zeroCounts(), flat, 10)).toEqual(flat);
    expect(shrinkToward(c, flat, 0)[6]).toBeCloseTo(0.5, 12);
    expect(() => shrinkToward(zeroCounts(), flat, 0)).toThrow(RangeError);
  });

  it("applies the option only within its window, then the base model", () => {
    const base = () => flat;
    const start = { b: 30, w: 6, r: 50 };
    const plain = createChaseModel(base).wp(start);
    expect(optionWp(base, flat, start, 6)).toBeCloseTo(plain, 12);
    // needing 50 off 30, attacking for an over beats blocking for an over
    expect(optionWp(base, attack, start, 6)).toBeGreaterThan(optionWp(base, block, start, 6));
    // a one-ball window moves WP less than a full over
    expect(Math.abs(optionWp(base, attack, start, 1) - plain)).toBeLessThan(Math.abs(optionWp(base, attack, start, 6) - plain));
    expect(() => optionWp(base, attack, start, 0)).toThrow(RangeError);
  });

  it("decides: best option, coin-flip band of 2 points, insufficient-data flag", () => {
    const base = () => flat;
    const start = { b: 30, w: 6, r: 50 };
    const d = decide(start, base, [{ option: "attack", dist: attack, n: 900 }, { option: "consolidate", dist: block, n: 900 }], { windowBalls: 6, minN: 300 });
    expect(d.best).toBe("attack");
    expect(d.gapPts).toBeGreaterThan(2);
    expect(d.coinFlip).toBe(false);
    const coin = decide(start, base, [{ option: "a", dist: flat, n: 900 }, { option: "b", dist: { ...flat }, n: 900 }], { windowBalls: 6, minN: 300 });
    expect(coin).toMatchObject({ coinFlip: true, best: null, gapPts: 0 });
    const thin = decide(start, base, [{ option: "attack", dist: attack, n: 900 }, { option: "consolidate", dist: block, n: 12 }], { windowBalls: 6, minN: 300 });
    expect(thin).toMatchObject({ insufficient: true, best: null });
    expect(thin.options[1].sufficient).toBe(false);
    expect(() => decide(start, base, [{ option: "only", dist: flat, n: 900 }], { windowBalls: 6, minN: 300 })).toThrow(RangeError);
  });

  it("counts outcomes per option and situation, with weights", () => {
    const c = fitOptionCounts([{ option: "pace", key: "0:1", outcome: 6 }, { option: "pace", key: "0:1", outcome: "W", w: 0.5 }, { option: "spin", key: "0:1", outcome: 0 }]);
    expect(c.pace["0:1"][6]).toBe(1);
    expect(c.pace["0:1"].W).toBe(0.5);
    expect(totalCount(c.pace["0:1"])).toBe(1.5);
    expect(totalCount(c.spin["9:9"])).toBe(0);
    expect(bandOf(7, [6, 8, 10])).toBe(1);
    expect(bandOf(6, [6, 8, 10])).toBe(0);
  });

  it("a moment with no counts for its situation falls back to the prior and is insufficient; no styles, no pace/spin", () => {
    const empty: OptionArtifact = { version: "t", trainedOnYears: [2020], shrinkK: 200, minN: 300, hasStyles: false, counts: {} };
    const s = { b: 30, w: 6, r: 50 };
    const d = momentDecision("next-over-intent", s, flat, () => flat, empty);
    expect(d?.options.every((o) => o.n === 0 && !o.sufficient)).toBe(true);
    expect(d?.insufficient).toBe(true);
    expect(momentDecision("death-bowling", { b: 12, w: 4, r: 20 }, flat, () => flat, empty)).toBeNull();
  });
});

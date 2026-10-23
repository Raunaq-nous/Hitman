import { describe, expect, it } from "vitest";
import { brierSeries, domainScores, MIN_SAMPLE, reliabilityBuckets } from "@/engine/reliability";

// Synthetic calls for testing the maths (not user data).
describe("notebook maths (reliability)", () => {
  it("buckets confidence in 10-point bands from 50 to 99 with hit rates and small-sample flags", () => {
    const calls = [
      ...Array.from({ length: 12 }, (_, i) => ({ confidence: 0.6, hit: i < 6 })),
      { confidence: 0.55, hit: true }, { confidence: 0.99, hit: false }, { confidence: 0.9, hit: true },
    ];
    const b = reliabilityBuckets(calls);
    expect(b.map((x) => [x.lo, x.hi])).toEqual([[50, 59], [60, 69], [70, 79], [80, 89], [90, 99]]);
    expect(b[1]).toMatchObject({ n: 12, hitRate: 0.5, small: false });
    expect(b[1].meanConfidence).toBeCloseTo(0.6, 12);
    expect(b[0]).toMatchObject({ n: 1, hitRate: 1, small: true });
    expect(b[2]).toMatchObject({ n: 0, hitRate: null, meanConfidence: null, small: true });
    expect(b[4]).toMatchObject({ n: 2, hitRate: 0.5 });
    expect(MIN_SAMPLE).toBe(10);
    expect(() => reliabilityBuckets([{ confidence: 0.3, hit: true }])).toThrow(RangeError);
  });

  it("Brier over time: each call's score and the running mean", () => {
    const s = brierSeries([{ confidence: 0.7, hit: false }, { confidence: 0.9, hit: true }]);
    expect(s[0]).toMatchObject({ i: 1 });
    expect(s[0].brier).toBeCloseTo(0.49, 12);
    expect(s[1].brier).toBeCloseTo(0.01, 12);
    expect(s[1].mean).toBeCloseTo(0.25, 12);
    expect(brierSeries([])).toEqual([]);
  });

  it("skill domains: mean read points and hit rate per domain, every domain listed, small samples flagged", () => {
    const d = domainScores([{ domains: ["intent", "death"], readPoints: 4, hit: true }, { domains: ["intent"], readPoints: -2, hit: false }], ["intent", "tempo", "death"]);
    expect(d.map((x) => x.domain)).toEqual(["intent", "tempo", "death"]);
    expect(d[0]).toMatchObject({ n: 2, meanRead: 1, hitRate: 0.5, small: true });
    expect(d[1]).toMatchObject({ n: 0, meanRead: null, hitRate: null, small: true });
    expect(d[2]).toMatchObject({ n: 1, meanRead: 4, hitRate: 1 });
  });
});

import { describe, expect, it } from "vitest";
import { applyIsotonic, buckets, calibrationGate, fitIsotonic, gatePower, normalCdf, type Sample } from "@/engine/calibration";

// deterministic pseudo-random generator for synthetic test samples
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

describe("calibration: isotonic map", () => {
  it("is non-decreasing and pools violators", () => {
    const m = fitIsotonic([{ p: 0.1, y: 0 }, { p: 0.2, y: 1 }, { p: 0.3, y: 0 }, { p: 0.4, y: 1 }]);
    for (let i = 1; i < m.ys.length; i++) expect(m.ys[i]).toBeGreaterThanOrEqual(m.ys[i - 1]);
    expect(m.ys).toEqual([0, 0, 0.5, 0.5, 1, 1]);
    expect(m.xs).toEqual([0.1, 0.1, 0.2, 0.3, 0.4, 0.4]);
    expect(applyIsotonic(m, 0)).toBe(0);
    expect(applyIsotonic(m, 0.95)).toBe(1);
    expect(applyIsotonic(m, 0.25)).toBe(0.5);
    expect(applyIsotonic(m, 0.35)).toBeCloseTo(0.75, 12);
    expect(() => fitIsotonic([])).toThrow(RangeError);
  });

  it("fixes a miscalibrated model so held-out buckets pass the gate", () => {
    // truth: P(win) = 0.15 + 0.7p, but the raw model reports p (miscalibrated at both ends)
    const r = rng(7);
    const draw = (n: number): Sample[] => Array.from({ length: n }, () => {
      const p = r();
      return { p, y: (r() < 0.15 + 0.7 * p ? 1 : 0) as 0 | 1 };
    });
    const train = draw(20000), held = draw(20000);
    expect(calibrationGate(buckets(held)).ok).toBe(false);
    const map = fitIsotonic(train);
    const calibrated = held.map((s) => ({ p: applyIsotonic(map, s.p), y: s.y }));
    const gate = calibrationGate(buckets(calibrated));
    expect(gate.checked).toBeGreaterThan(3);
    expect(gate.ok).toBe(true);
  });
});

describe("calibration: buckets and gate", () => {
  it("builds ten 10-point buckets with counts and skips small buckets in the gate", () => {
    const bs = buckets([{ p: 0.05, y: 0 }, { p: 1, y: 1 }, { p: 0.55, y: 1 }]);
    expect(bs).toHaveLength(10);
    expect(bs[0]).toMatchObject({ n: 1, observed: 0 });
    expect(bs[9]).toMatchObject({ n: 1, observed: 1 });
    expect(bs[3]).toEqual({ lo: 0.3, hi: 0.4, n: 0, meanPredicted: null, observed: null, errorPts: null });
    expect(calibrationGate(bs)).toEqual({ ok: true, failing: [], checked: 0 });
    expect(calibrationGate(bs, 1).ok).toBe(false);
  });
});

describe("gate power (calibration)", () => {
  it("normalCdf matches known values", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 7);
    expect(normalCdf(1.959964)).toBeCloseTo(0.975, 6);
    expect(normalCdf(-1)).toBeCloseTo(0.158655, 6);
  });

  it("clustered samples have a larger standard error than independent ones", () => {
    // 400 samples at p = 0.5: as 400 independent clusters, then as 20 clusters of 20 (one outcome each)
    const flat = Array.from({ length: 400 }, (_, i) => ({ p: 0.55, y: (i % 2) as 0 | 1, cluster: `m${i}` }));
    const grouped = flat.map((s, i) => ({ ...s, cluster: `m${Math.floor(i / 20)}` }));
    const a = gatePower(flat).buckets[0], b = gatePower(grouped).buckets[0];
    expect(a).toMatchObject({ lo: 0.5, n: 400, clusters: 400 });
    expect(a.sePts).toBeCloseTo(100 * Math.sqrt(0.55 * 0.45 / 400), 9);
    expect(b.clusters).toBe(20);
    expect(b.sePts).toBeCloseTo(a.sePts * Math.sqrt(20), 9);
    expect(b.pWithin).toBeLessThan(a.pWithin);
    expect(gatePower(flat).passProbability).toBe(a.pWithin);
  });

  it("skips buckets below minN; a certain bucket has zero error; no gated buckets pass trivially", () => {
    const sure = Array.from({ length: 300 }, (_, i) => ({ p: 1, y: 1 as const, cluster: `m${i}` }));
    expect(gatePower(sure).buckets[0]).toMatchObject({ lo: 0.9, sePts: 0, pWithin: 1 });
    expect(gatePower(sure.slice(0, 10))).toEqual({ buckets: [], passProbability: 1 });
  });
});

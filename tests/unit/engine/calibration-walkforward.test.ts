import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { calibrationSlopeTest, matchBrier, type MatchSample } from "@/engine/matchCalibration";

// data/models/calibration-v3.json: the owner's walk-forward gate (D-030) on Cricsheet IPL (npm run model:calibration).
interface Row { match: string; date: string; y: 0 | 1; delta: number; walkForward: number[]; exact: number[]; baseline: number[] }
const file = JSON.parse(readFileSync("data/models/calibration-v3.json", "utf8")) as {
  hash: string; pass: boolean; tuning: { seasons: number[]; grid: { eta: number; brier: number }[]; eta: number };
  gate: { boot: number }; pooled: { matches: number; wald: number; critical: number; reject: boolean; brier: { walkForward: number; exact: number; runRateLogistic: number } };
  simulation: { runs: number; calibratedPassRate: number; minDetectableShiftPts: number | null };
  checks: Record<string, boolean>; seasons: { season: number; chaseWinRate: number; rows: Row[] }[];
};
const flat = (rows: Row[], k: "walkForward" | "exact" | "baseline"): MatchSample[] => rows.flatMap((r) => r[k].map((p) => ({ p, y: r.y, match: r.match })));

describe("walk-forward calibration gate on real seasons (calibration)", () => {
  it("is versioned by a content hash", () => {
    const { hash, ...rest } = file;
    expect(createHash("sha256").update(JSON.stringify(rest)).digest("hex")).toBe(hash);
  });

  it("tunes the update rate on 2023–2024 only and scores each match with earlier dates only", () => {
    expect(file.tuning.seasons).toEqual([2023, 2024]);
    expect(file.tuning.grid.reduce((a, g) => (g.brier < a.brier ? g : a)).eta).toBe(file.tuning.eta);
    for (const s of file.seasons) {
      const rows = [...s.rows].sort((a, b) => a.date.localeCompare(b.date));
      // the intercept never changes within a date: same-day matches don't inform each other
      for (let i = 1; i < rows.length; i++) if (rows[i].date === rows[i - 1].date) expect(rows[i].delta).toBe(rows[i - 1].delta);
      expect(rows.every((r) => r.walkForward.length === r.exact.length)).toBe(true);
    }
  });

  it("the stored predictions reproduce the pooled verdict (match as the unit)", () => {
    const pooled = file.seasons.flatMap((s) => s.rows);
    expect(new Set(pooled.map((r) => r.match)).size).toBe(file.pooled.matches);
    const t = calibrationSlopeTest(flat(pooled, "walkForward"), { boot: file.gate.boot, seed: 2025 });
    expect(t.wald).toBeCloseTo(file.pooled.wald, 2);
    expect(t.reject).toBe(file.pooled.reject);
    expect(matchBrier(flat(pooled, "walkForward"))).toBeCloseTo(file.pooled.brier.walkForward, 4);
    expect(matchBrier(flat(pooled, "exact"))).toBeCloseTo(file.pooled.brier.exact, 4);
    expect(matchBrier(flat(pooled, "baseline"))).toBeCloseTo(file.pooled.brier.runRateLogistic, 4);
  });

  it("passes all four D-030 checks with the map's window seasons scored out of sample (D-038)", () => {
    expect(file.checks).toEqual({ a_calibrationNotRejected: true, b_brierBeatsExact: true, b_brierWithinLogistic: true, c_calibratedPassRate: true, d_minDetectableShift: true });
    expect(file.pass).toBe(true);
    expect(file.pooled.wald).toBeLessThan(file.pooled.critical);
    expect(file.pooled.brier.walkForward).toBeLessThan(file.pooled.brier.exact);
    expect(file.pooled.brier.walkForward).toBeLessThanOrEqual(file.pooled.brier.runRateLogistic + 0.002);
    expect(file.simulation.calibratedPassRate).toBeGreaterThanOrEqual(0.9);
    expect(file.simulation.minDetectableShiftPts).toBeLessThanOrEqual(15);
    expect(file.seasons.find((s) => s.season === 2026)?.chaseWinRate).toBeCloseTo(0.6429, 4);
  });
});

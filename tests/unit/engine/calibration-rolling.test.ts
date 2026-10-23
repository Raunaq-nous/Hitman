import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { matchBrier, matchCalibrationTest, type MatchSample } from "@/engine/matchCalibration";

// data/models/calibration-v2.json: the owner's rolling-origin gate (D-027) run on Cricsheet IPL (npm run model:calibration).
interface Season {
  season: number; outcomeTrainedOn: number[]; calibrationFitOn: number[]; pass: boolean; brierOk: boolean;
  test: { pass: boolean; ece: number; buckets: { matches: number; covered: boolean }[] };
  brier: { recalibrated: number; exact: number; runRateLogistic: number };
  fairness: { runs: number; variants: Record<string, { calibratedPassRate: number; shiftedUpFailRate: number; shiftedDownFailRate: number; fairAndStrict: boolean }> };
  matches: { match: string; y: 0 | 1; recalibrated: number[]; exact: number[]; runRateLogistic: number[] }[];
}
const file = JSON.parse(readFileSync("data/models/calibration-v2.json", "utf8")) as { hash: string; pass: boolean; gate: object; tuning: { season: number; chosen: object; grid: { choices: object; brier: number }[] }; evaluations: Season[]; drift: { season: number; chaseWinRate: number }[]; production: { forSeason: number; calibrationFitOn: number[] } };
const samples = (s: Season, key: "recalibrated" | "exact" | "runRateLogistic"): MatchSample[] => s.matches.flatMap((m) => m[key].map((p) => ({ p, y: m.y, match: m.match })));

describe("rolling-origin calibration gate on real seasons (calibration)", () => {
  it("is versioned by a content hash", () => {
    const { hash, ...rest } = file;
    expect(createHash("sha256").update(JSON.stringify(rest)).digest("hex")).toBe(hash);
  });

  it("tunes on 2024 only and never fits a season's map on that season", () => {
    expect(file.tuning.season).toBe(2024);
    expect(file.tuning.grid.length).toBe(18);
    expect(file.tuning.grid.reduce((a, g) => (g.brier < a.brier ? g : a)).choices).toEqual(file.tuning.chosen);
    for (const s of file.evaluations) {
      expect(s.calibrationFitOn).toEqual([s.season - 3, s.season - 2, s.season - 1]);
      expect(Math.max(...s.outcomeTrainedOn)).toBeLessThan(s.season);
    }
    expect(file.evaluations.map((s) => s.season)).toEqual([2025, 2026]);
    expect(file.production).toMatchObject({ forSeason: 2027, calibrationFitOn: [2024, 2025, 2026] });
  });

  it("the stored predictions reproduce each season's verdict, bucket by bucket, with the match as the unit", () => {
    for (const s of file.evaluations) {
      const r = matchCalibrationTest(samples(s, "recalibrated"), { minMatches: 40, boot: 1000, level: 0.95, maxEce: 0.05 });
      expect(r.matches).toBe(s.matches.length);
      expect(r.buckets.map((b) => [b.matches, b.covered])).toEqual(s.test.buckets.map((b) => [b.matches, b.covered]));
      expect(r.buckets.every((b) => b.matches >= 40)).toBe(true);
      expect(r.ece).toBeCloseTo(s.test.ece, 4);
      expect(r.pass).toBe(s.test.pass);
      expect(matchBrier(samples(s, "recalibrated"))).toBeCloseTo(s.brier.recalibrated, 4);
      expect(matchBrier(samples(s, "exact"))).toBeCloseTo(s.brier.exact, 4);
      expect(matchBrier(samples(s, "runRateLogistic"))).toBeCloseTo(s.brier.runRateLogistic, 4);
      expect(s.brierOk).toBe(s.brier.recalibrated < s.brier.exact && s.brier.recalibrated < s.brier.runRateLogistic);
    }
  });

  it("records the measured result honestly: the gate fails (2026 drift; the test is not fair and strict at ~70 matches a season)", () => {
    const [y2025, y2026] = file.evaluations;
    expect(file.pass).toBe(false);
    expect(y2026.test.pass).toBe(false);
    expect(y2025.brier.recalibrated).toBeLessThan(y2025.brier.exact);
    expect(y2026.brier.recalibrated).toBeLessThan(y2026.brier.runRateLogistic);
    for (const s of file.evaluations) {
      expect(s.fairness.runs).toBe(200);
      for (const v of Object.values(s.fairness.variants)) expect(v.fairAndStrict).toBe(v.calibratedPassRate >= 0.9 && v.shiftedUpFailRate >= 0.8 && v.shiftedDownFailRate >= 0.8);
      expect(Object.values(s.fairness.variants).some((v) => v.fairAndStrict)).toBe(false);
    }
    expect(file.drift.find((d) => d.season === 2026)?.chaseWinRate).toBeCloseTo(0.6429, 4);
  });
});

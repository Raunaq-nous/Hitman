import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { OUTCOMES } from "@/engine/chaseWp";
import { bucketKey, chaseSamples, fitOutcomes, predictOutcome, predictStyles, type OutcomeArtifact, type Sample } from "@/engine/outcomeModel";
import { loadChaseSamples } from "../../../scripts/fit-outcomes";

const file = JSON.parse(readFileSync("data/models/outcomes-v1.json", "utf8")) as OutcomeArtifact & { hash: string; source: string };
let samples: Sample[];
beforeAll(() => { samples = loadChaseSamples(); }, 60_000);

describe("per-ball outcome model (outcomes)", () => {
  it("every distribution is over {0..6, W} and sums to 1", () => {
    for (const d of [file.global, ...Object.values(file.parents), ...Object.values(file.buckets)]) {
      expect(Object.keys(d).sort()).toEqual(OUTCOMES.map(String).sort());
      expect(OUTCOMES.reduce<number>((a, o) => a + d[o], 0)).toBeCloseTo(1, 12);
    }
  });

  it("is trained on older seasons only, with the latest three held out", () => {
    expect(file.heldOutYears).toHaveLength(3);
    expect(Math.max(...file.trainedOnYears)).toBeLessThan(Math.min(...file.heldOutYears));
    const years = [...new Set(samples.map((s) => s.year))].sort();
    expect(file.heldOutYears).toEqual(years.slice(-3));
  });

  it("the artifact is versioned with a hash of its content and refits identically from the derived data", () => {
    const { hash, source, ...artifact } = file;
    expect(source).toMatch(/Cricsheet/);
    expect(createHash("sha256").update(JSON.stringify(artifact)).digest("hex")).toBe(hash);
    const refit = fitOutcomes(samples, file.trainedOnYears, file.heldOutYears, undefined, "v1");
    expect(createHash("sha256").update(JSON.stringify(refit)).digest("hex")).toBe(hash);
  });

  it("held-out seasons can't leak into the fit", () => {
    const leak: Sample = { matchId: "x", year: file.heldOutYears[0], target: 180, state: { b: 6, w: 2, r: 30 }, outcome: 6 };
    const a = fitOutcomes(samples, file.trainedOnYears, file.heldOutYears);
    const b = fitOutcomes([...samples, ...Array(500).fill(leak)], file.trainedOnYears, file.heldOutYears);
    expect(b).toEqual(a);
    expect(() => fitOutcomes([], [2000], [2001])).toThrow(RangeError);
  });

  it("captures cricket: more sixes when the rate is steep, more wickets at the death", () => {
    const steep = predictOutcome(file, { b: 18, w: 6, r: 50 }, 180);
    const easy = predictOutcome(file, { b: 18, w: 6, r: 12 }, 180);
    expect(steep[6]).toBeGreaterThan(easy[6]);
    expect(predictOutcome(file, { b: 6, w: 3, r: 20 }, 180).W).toBeGreaterThan(predictOutcome(file, { b: 100, w: 10, r: 140 }, 180).W);
    expect(predictOutcome(file, { b: 300, w: 10, r: 1 }, 180)).toBe(file.global);
    expect(predictOutcome({ ...file, buckets: {} }, { b: 6, w: 3, r: 20 }, 180)).toBe(file.parents["2:0:1"]);
  });

  it("builds legal-ball chase states from real deliveries (KKR v RCB, 2008: 223 to win)", () => {
    const m = samples.filter((s) => s.matchId === "335982");
    expect(m[0].state).toEqual({ b: 120, w: 10, r: 223 });
    for (let i = 1; i < m.length; i++) expect(m[i].state.b).toBe(m[i - 1].state.b - 1);
    expect(m.length).toBeLessThanOrEqual(120);
  });

  it("carries wides and no-ball runs and wickets to the next legal ball", () => {
    const s = chaseSamples([
      { matchId: "t", year: 2020, innings: 2, runsBatter: 0, extras: 1, extraType: "wides", wicket: false, target: 10 },
      { matchId: "t", year: 2020, innings: 2, runsBatter: 2, extras: 0, extraType: null, wicket: false, target: 10 },
      { matchId: "t", year: 2020, innings: 2, runsBatter: 0, extras: 1, extraType: "wides", wicket: true, target: 10 },
      { matchId: "t", year: 2020, innings: 2, runsBatter: 0, extras: 0, extraType: null, wicket: false, target: 10 },
      { matchId: "t", year: 2020, innings: 2, runsBatter: 6, extras: 1, extraType: "byes", wicket: false, target: 10 },
    ]);
    expect(s.map((x) => [x.state.r, x.outcome])).toEqual([[9, 2], [6, "W"], [6, 6]]);
    // deliveries recorded after the chase is decided are not samples (guard against malformed data)
    const won = chaseSamples([
      { matchId: "t", year: 2020, innings: 2, runsBatter: 6, extras: 0, extraType: null, wicket: false, target: 5 },
      { matchId: "t", year: 2020, innings: 2, runsBatter: 1, extras: 0, extraType: null, wicket: false, target: 5 },
    ]);
    expect(won.map((x) => x.outcome)).toEqual([6]);
    expect(predictStyles(file, { b: 30, w: 7, r: 40 }, 180)).toEqual([7, 2, 4, 6].map((w) => predictOutcome(file, { b: 30, w, r: 40 }, 180)));
    expect(predictStyles(file, { b: 30, w: 1, r: 40 }, 180)).toHaveLength(1);
    expect(chaseSamples([{ matchId: "t", year: 2020, innings: 1, runsBatter: 1, extras: 0, extraType: null, wicket: false, target: null }])).toEqual([]);
    expect(bucketKey({ b: 120, w: 10, r: 200 }, 200)).toBe("3:5:4:2");
    expect(s.every((x) => x.target === 10)).toBe(true);
  });
});

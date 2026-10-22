import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { brier, grade, gradeDecision } from "@/engine/grader";
import { parseCricsheet } from "@/adapters/cricket/cricsheet";
import { chaseSamples, predictOutcome, predictStyles, type OutcomeArtifact } from "@/engine/outcomeModel";
import { momentDecision, type OptionArtifact } from "@/engine/options";

describe("grader", () => {
  it("read points = WP(pick) − best other, in points", () => {
    expect(grade({ pace: 0.63, spin: 0.58 }, "pace")).toEqual({ readPoints: expect.closeTo(5, 9), coinFlip: false, best: "pace", calibration: "provisional" });
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

  it("grades a real moment from the exact model's option differences, always marked provisional (D-031)", () => {
    // 2017 Gujarat Lions v Mumbai Indians chase (Cricsheet 1082625), 36 balls left
    const outcomes = JSON.parse(readFileSync("data/models/outcomes-v1.json", "utf8")) as OutcomeArtifact;
    const options = JSON.parse(readFileSync("data/models/options-v1.json", "utf8")) as OptionArtifact;
    const e = parseCricsheet(JSON.parse(readFileSync("data/fixtures/cricsheet/1082625.json", "utf8")), "1082625");
    const chase = chaseSamples(e.incidents.map((i) => i.payload as { innings: number; superOver: boolean; runs: number; extras: number; extraType: string | null; wicket: boolean; target?: number })
      .filter((p) => p.innings === 2 && !p.superOver)
      .map((p) => ({ matchId: "1082625", year: 2017, innings: 2, runsBatter: p.runs, extras: p.extras, extraType: p.extraType, wicket: p.wicket, target: p.target ?? null })));
    const target = chase[0].target;
    const s = (chase.find((x) => x.state.b === 36) as (typeof chase)[number]).state;
    const d = momentDecision("next-over-intent", s, predictOutcome(outcomes, s, target), (st) => predictStyles(outcomes, st, target), options);
    expect(d).not.toBeNull();
    const [a, b] = d?.options ?? [];
    const ga = gradeDecision(d!, a.option), gb = gradeDecision(d!, b.option);
    expect(ga?.readPoints).toBeCloseTo((a.wp - b.wp) * 100, 9);
    expect(gb?.readPoints).toBeCloseTo((b.wp - a.wp) * 100, 9);
    expect(ga?.calibration).toBe("provisional");
    expect(ga?.coinFlip).toBe(d?.coinFlip);
    // a decision without enough data is never graded
    expect(gradeDecision({ ...d!, insufficient: true }, a.option)).toBeNull();
  });
});

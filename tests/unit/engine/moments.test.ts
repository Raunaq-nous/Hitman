import { describe, expect, it } from "vitest";
import { diversify, phaseOf, quantile, type Candidate } from "@/engine/moments";

// Synthetic candidates for testing the selection rules (not match data).
const c = (id: string, match: string, season: number, phase: Candidate["phase"], teams: string[], leverage: number): Candidate => ({ id, match, season, phase, teams, leverage });

describe("golden-moment selection (moments)", () => {
  it("phases by balls left", () => {
    expect([phaseOf(120), phaseOf(85), phaseOf(84), phaseOf(25), phaseOf(24), phaseOf(1)]).toEqual(["powerplay", "powerplay", "middle", "middle", "death", "death"]);
  });

  it("quantile by nearest rank", () => {
    expect(quantile([5, 1, 3, 2, 4], 0.9)).toBe(5);
    expect(quantile([5, 1, 3, 2, 4], 0.5)).toBe(3);
    expect(quantile([7], 0)).toBe(7);
    expect(() => quantile([], 0.5)).toThrow(RangeError);
  });

  it("takes the highest leverage first, one per match, within season, phase and team caps", () => {
    const cands = [
      c("a1", "A", 2024, "death", ["X", "Y"], 0.30), c("a2", "A", 2024, "middle", ["X", "Y"], 0.29),
      c("b1", "B", 2024, "death", ["X", "Z"], 0.28), c("c1", "C", 2025, "death", ["W", "V"], 0.27),
      c("d1", "D", 2025, "middle", ["W", "Y"], 0.26), c("e1", "E", 2026, "powerplay", ["U", "T"], 0.10),
    ];
    const caps = { perSeason: 5, perPhase: { powerplay: 5, middle: 5, death: 2 }, perTeam: 1 };
    const got = diversify(cands, 10, caps).map((x) => x.id);
    // a2 skipped (match A used); b1 skipped (team X capped); c1 fits death's cap of 2; d1 skipped (team W capped)
    expect(got).toEqual(["a1", "c1", "e1"]);
    expect(diversify(cands, 1, caps).map((x) => x.id)).toEqual(["a1"]);
    expect(diversify(cands, 10, { ...caps, perSeason: 1, perTeam: 9 }).map((x) => x.id)).toEqual(["a1", "c1", "e1"]);
  });

  it("breaks leverage ties by id, so selection is deterministic", () => {
    const caps = { perSeason: 9, perPhase: { powerplay: 9, middle: 9, death: 9 }, perTeam: 9 };
    const tied = [c("z", "Z", 2024, "death", ["A"], 0.2), c("m", "M", 2024, "death", ["B"], 0.2)];
    expect(diversify(tied, 1, caps).map((x) => x.id)).toEqual(["m"]);
  });

  it("caps how many moments share an answer, so no fixed answer scores well", () => {
    const caps = { perSeason: 9, perPhase: { powerplay: 9, middle: 9, death: 9 }, perTeam: 9, perAnswer: 1 };
    const tagged = [{ ...c("a", "A", 2024, "death", ["A"], 0.3), answer: "higher" }, { ...c("b", "B", 2024, "death", ["B"], 0.2), answer: "higher" }, { ...c("d", "D", 2024, "death", ["D"], 0.15), answer: "current" }, c("e", "E", 2024, "death", ["E"], 0.1)];
    expect(diversify(tagged, 9, caps).map((x) => x.id)).toEqual(["a", "d", "e"]);
    expect(diversify(tagged, 9, { ...caps, perAnswer: undefined }).map((x) => x.id)).toEqual(["a", "b", "d", "e"]);
  });
});

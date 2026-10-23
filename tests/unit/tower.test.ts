import { describe, expect, it } from "vitest";
import { towerEntries, weekStart } from "@/domain/lab/service";

// Synthetic call histories for testing the tower rules (not user data).
const at = (iso: string) => new Date(iso);
const call = (lockedAt: string, review: { graded: boolean; hit: boolean | null; brier: number | null; ratingAfter: number } | null) => ({ lockedAt: at(lockedAt), review });
const NOW = at("2026-10-22T12:00:00Z"); // a Thursday; the week starts Monday 2026-10-19

describe("crew timing tower (tower)", () => {
  it("weeks start on Monday 00:00 UTC", () => {
    expect(weekStart(NOW).toISOString()).toBe("2026-10-19T00:00:00.000Z");
    expect(weekStart(at("2026-10-19T00:00:00Z")).toISOString()).toBe("2026-10-19T00:00:00.000Z");
    expect(weekStart(at("2026-10-25T23:59:00Z")).toISOString()).toBe("2026-10-19T00:00:00.000Z");
  });

  it("ranks by Read Rating with calibration, calls this week, form and position change since the week began", () => {
    const rows = towerEntries([
      // Ana led before the week; a poor week drops her to second
      { id: "a", name: "Ana", calls: [call("2026-10-12T10:00:00Z", { graded: true, hit: true, brier: 0.04, ratingAfter: 1240 }), call("2026-10-20T10:00:00Z", { graded: true, hit: false, brier: 0.64, ratingAfter: 1205 })] },
      // Bo climbs this week
      { id: "b", name: "Bo", calls: [call("2026-10-13T10:00:00Z", { graded: true, hit: true, brier: 0.09, ratingAfter: 1215 }), call("2026-10-21T10:00:00Z", { graded: true, hit: true, brier: 0.01, ratingAfter: 1250 }), call("2026-10-21T11:00:00Z", { graded: false, hit: null, brier: null, ratingAfter: 1250 })] },
      // Cy has no calls
      { id: "c", name: "Cy", calls: [] },
    ], NOW);
    expect(rows.map((r) => [r.rank, r.name, r.readRating, r.change])).toEqual([[1, "Bo", 1250, 1], [2, "Ana", 1205, -1], [3, "Cy", 1200, 0]]);
    expect(rows[0]).toMatchObject({ callsThisWeek: 2, form: ["good", "good", "none"] });
    expect(rows[0].brier).toBeCloseTo(0.05, 12);
    expect(rows[1]).toMatchObject({ callsThisWeek: 1, form: ["good", "poor"] });
    expect(rows[2]).toMatchObject({ brier: null, callsThisWeek: 0, form: [] });
  });

  it("form shows the last five calls; ties rank by name", () => {
    const many = Array.from({ length: 7 }, (_, i) => call(`2026-10-0${i + 1}T10:00:00Z`, { graded: true, hit: i % 2 === 0, brier: 0.1, ratingAfter: 1200 }));
    const rows = towerEntries([{ id: "z", name: "Zed", calls: many }, { id: "y", name: "Yan", calls: [] }], NOW);
    expect(rows.map((r) => r.name)).toEqual(["Yan", "Zed"]);
    expect(rows[1].form).toEqual(["good", "poor", "good", "poor", "good"]);
  });
});

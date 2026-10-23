import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { checkCricketContract } from "@/domain/facts/contract";
import { chaseSamples } from "@/engine/outcomeModel";
import { RATE_EDGES } from "@/engine/options";
import { parseCsv } from "../../../scripts/fit-outcomes";
import { CAPS, eventFromDerived } from "../../../scripts/select-golden-moments";

// data/fixtures/moments/golden-moments.json, selected from Cricsheet IPL 2024–2026 (npm run data:moments).
interface Moment {
  id: string; matchId: string; season: number; date: string; observedCutoff: string; leverage: number;
  prelock: Record<string, unknown> & { battingTeam: string; bowlingTeam: string; target: number; ballsLeft: number; wicketsInHand: number; runsRequired: number; phase: string; overs: string };
  decision: { type: string; options: { option: string; label: string; wp: number; n: number }[]; best: string | null; answer: string; gapPts: number; calibration: string };
  reveal: { chaseWon: 0 | 1; winner: string };
}
const file = JSON.parse(readFileSync("data/fixtures/moments/golden-moments.json", "utf8")) as { hash: string; seasons: number[]; leverageThreshold: number; moments: Moment[] } & Record<string, unknown>;
const matches = new Map(parseCsv(gunzipSync(readFileSync("data/derived/ipl-matches.csv.gz")).toString("utf8")).map((m) => [m.match_id, m]));
const rowsOf = new Map<string, Record<string, string>[]>();
for (const b of parseCsv(gunzipSync(readFileSync("data/derived/ipl-balls.csv.gz")).toString("utf8"))) {
  if (!file.moments.some((m) => m.matchId === b.match_id)) continue;
  const l = rowsOf.get(b.match_id); if (l) l.push(b); else rowsOf.set(b.match_id, [b]);
}

describe("fifty golden moments (moments)", () => {
  it("are versioned, fifty, one per match, from the held-out seasons, within the diversity caps", () => {
    const { hash, source, ...rest } = file;
    expect(source).toMatch(/Cricsheet/);
    expect(createHash("sha256").update(JSON.stringify(rest)).digest("hex")).toBe(hash);
    expect(file.moments).toHaveLength(50);
    expect(new Set(file.moments.map((m) => m.matchId)).size).toBe(50);
    expect(file.seasons).toEqual([2024, 2025, 2026]);
    const count = (k: (m: Moment) => string[]) => file.moments.flatMap(k).reduce<Record<string, number>>((o, x) => ({ ...o, [x]: (o[x] ?? 0) + 1 }), {});
    expect(Math.max(...Object.values(count((m) => [String(m.season)])))).toBeLessThanOrEqual(CAPS.perSeason);
    for (const [phase, n] of Object.entries(count((m) => [m.prelock.phase]))) expect(n).toBeLessThanOrEqual(CAPS.perPhase[phase as keyof typeof CAPS.perPhase]);
    expect(Math.max(...Object.values(count((m) => [m.prelock.battingTeam, m.prelock.bowlingTeam])))).toBeLessThanOrEqual(CAPS.perTeam);
    expect(Object.keys(count((m) => [String(m.season)])).length).toBe(3);
  });

  it("are top-decile leverage moments with gradeable decisions, marked provisional", () => {
    for (const m of file.moments) {
      expect(m.leverage).toBeGreaterThanOrEqual(file.leverageThreshold);
      expect(m.decision.options.length).toBeGreaterThanOrEqual(2);
      expect(m.decision.gapPts).toBeGreaterThanOrEqual(2);
      expect(m.decision.best).toBe([...m.decision.options].sort((a, b) => b.wp - a.wp)[0].option);
      expect(m.decision.options.every((o) => o.n >= 300 && o.wp > 0 && o.wp < 1)).toBe(true);
      expect(m.decision.calibration).toBe("provisional");
      const band = RATE_EDGES.findIndex((e) => (m.prelock.runsRequired * 6) / m.prelock.ballsLeft <= e);
      const best = Number((m.decision.best as string).slice(5));
      expect(m.decision.answer).toBe(best > band ? "higher" : best < band ? "lower" : "current");
    }
    // not trivially answerable: no fixed answer is right more than 40% of the time
    const answers = file.moments.reduce<Record<string, number>>((o, m) => ({ ...o, [m.decision.answer]: (o[m.decision.answer] ?? 0) + 1 }), {});
    expect(Math.max(...Object.values(answers))).toBeLessThanOrEqual(CAPS.perAnswer);
    expect(Object.keys(answers).length).toBeGreaterThanOrEqual(2);
    // the best phase rule (each phase's most common answer) is right at most 70% of the time
    const byPhase = file.moments.reduce<Record<string, Record<string, number>>>((o, m) => { const p = (o[m.prelock.phase] ??= {}); p[m.decision.answer] = (p[m.decision.answer] ?? 0) + 1; return o; }, {});
    const phaseRule = Object.values(byPhase).reduce((a, p) => a + Math.max(...Object.values(p)), 0);
    expect(phaseRule / file.moments.length).toBeLessThanOrEqual(0.7);
  });

  it("come from matches the data contract accepts, and their pre-lock state matches the ball-by-ball data", () => {
    for (const m of file.moments) {
      const match = matches.get(m.matchId) as Record<string, string>;
      const rows = rowsOf.get(m.matchId) as Record<string, string>[];
      const c = checkCricketContract(eventFromDerived(match, rows));
      expect(c.ok, m.id).toBe(true);
      expect(c.chaseEligible, m.id).toBe(true);
      expect(match.result).not.toBe("tie");
      const chase = chaseSamples(rows.filter((r) => r.innings === "2").map((r) => ({ matchId: m.matchId, year: m.season, innings: 2, runsBatter: Number(r.runs_batter), extras: Number(r.extras), extraType: r.extra_type || null, wicket: r.wicket === "1", target: r.target ? Number(r.target) : null })));
      const s = chase.find((x) => x.state.b === m.prelock.ballsLeft);
      expect(s?.state, m.id).toEqual({ b: m.prelock.ballsLeft, w: m.prelock.wicketsInHand, r: m.prelock.runsRequired });
      expect(s?.target).toBe(m.prelock.target);
      expect(m.reveal.chaseWon).toBe(match.winner === m.prelock.battingTeam ? 1 : 0);
    }
  });

  it("store a cutoff before the decision ball and nothing observed after it in the pre-lock state", () => {
    for (const m of file.moments) {
      const legal = 120 - m.prelock.ballsLeft;
      expect(m.prelock.overs).toBe(`${Math.floor(legal / 6)}.${legal % 6}`);
      expect(Date.parse(m.observedCutoff)).toBeGreaterThanOrEqual(Date.parse(`${m.date}T14:00:00Z`));
      for (const key of ["winner", "chaseWon", "result", "reveal"]) expect(m.prelock).not.toHaveProperty(key);
      // the pre-lock state is exactly what the deliveries up to the cutoff add up to, and the next delivery is legal
      const rows = rowsOf.get(m.matchId) as Record<string, string>[];
      const seen = Math.round((Date.parse(m.observedCutoff) - Date.parse(`${m.date}T14:00:00Z`)) / 30_000) + 1;
      const chase = rows.slice(0, seen).filter((r) => r.innings === "2");
      expect(m.prelock.target - chase.reduce((a, r) => a + Number(r.runs_batter) + Number(r.extras), 0), m.id).toBe(m.prelock.runsRequired);
      expect(10 - chase.filter((r) => r.wicket === "1").length, m.id).toBe(m.prelock.wicketsInHand);
      expect(120 - chase.filter((r) => r.extra_type !== "wides" && r.extra_type !== "noballs").length, m.id).toBe(m.prelock.ballsLeft);
      expect(["wides", "noballs"], m.id).not.toContain(rows[seen].extra_type);
    }
  });
});

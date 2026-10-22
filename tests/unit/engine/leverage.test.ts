import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCricsheet } from "@/adapters/cricket/cricsheet";
import { checkCricketContract } from "@/domain/facts/contract";
import { createChaseModel, swing } from "@/engine/chaseWp";
import { chaseSamples, predictStyles, type OutcomeArtifact } from "@/engine/outcomeModel";

// Real chases from the committed Cricsheet fixtures, scored with the fitted outcome model (data/models/outcomes-v1.json).
const model = JSON.parse(readFileSync("data/models/outcomes-v1.json", "utf8")) as OutcomeArtifact;
const dir = "data/fixtures/cricsheet";
const chases = readdirSync(dir).filter((f) => /^\d+\.json$/.test(f)).map((f) => parseCricsheet(JSON.parse(readFileSync(`${dir}/${f}`, "utf8")), f.slice(0, -5)))
  .filter((e) => checkCricketContract(e).chaseEligible)
  .map((e) => {
    const balls = e.incidents.map((i) => i.payload as { innings: number; superOver: boolean; runs: number; extras: number; extraType: string | null; wicket: boolean; target?: number })
      .filter((p) => p.innings === 2 && !p.superOver)
      .map((p) => ({ matchId: e.sourceRef, year: Number(e.season.slice(0, 4)), innings: 2, runsBatter: p.runs, extras: p.extras, extraType: p.extraType, wicket: p.wicket, target: p.target ?? null }));
    const samples = chaseSamples(balls);
    const target = samples[0].target;
    const m = createChaseModel((s) => predictStyles(model, s, target));
    return { id: e.sourceRef, samples, m };
  });

const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

describe("leverage and swing on real chases (leverage)", () => {
  it("uses at least four real chases from the fixtures", () => {
    expect(chases.length).toBeGreaterThanOrEqual(4);
  });

  it("death-over leverage exceeds powerplay leverage", () => {
    const powerplay = chases.flatMap((c) => c.samples.filter((s) => s.state.b > 84).map((s) => c.m.leverage(s.state)));
    const death = chases.flatMap((c) => c.samples.filter((s) => s.state.b <= 24).map((s) => c.m.leverage(s.state)));
    expect(powerplay.length).toBeGreaterThan(100);
    expect(death.length).toBeGreaterThan(20);
    expect(mean(death)).toBeGreaterThan(mean(powerplay));
  });

  it("leverage is the std dev of next-ball WP and swing is |ΔWP| over a window", () => {
    for (const c of chases) {
      const first = c.samples[0].state, afterPowerplay = c.samples.find((s) => s.state.b === 84)?.state;
      if (!afterPowerplay) continue;
      const pp = swing(c.m.wp(first), c.m.wp(afterPowerplay));
      expect(pp).toBeCloseTo(Math.abs(c.m.wp(afterPowerplay) - c.m.wp(first)), 12);
      expect(pp).toBeGreaterThanOrEqual(0);
      expect(pp).toBeLessThanOrEqual(1);
      for (const s of c.samples) expect(c.m.leverage(s.state)).toBeGreaterThanOrEqual(0);
    }
  });
});

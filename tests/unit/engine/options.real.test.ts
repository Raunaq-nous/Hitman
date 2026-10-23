import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCricsheet } from "@/adapters/cricket/cricsheet";
import { chaseSamples, predictOutcome, predictStyles, type OutcomeArtifact } from "@/engine/outcomeModel";
import { checkRight } from "@/rights";
import { momentDecision, momentOptions, shrinkToward, situationKey, type OptionArtifact } from "@/engine/options";
import { buildOptions, loadStyles, styleClass } from "../../../scripts/fit-options";

// Fitted on Cricsheet IPL 2008–2023 (the outcomes-v1 training seasons); bowling styles from Wikidata via the courier.
const outcomes = JSON.parse(readFileSync("data/models/outcomes-v1.json", "utf8")) as OutcomeArtifact;
const file = JSON.parse(readFileSync("data/models/options-v1.json", "utf8")) as OptionArtifact & { hash: string; source: string };
// a real chase: 2017, Gujarat Lions v Mumbai Indians (tied)
const e = parseCricsheet(JSON.parse(readFileSync("data/fixtures/cricsheet/1082625.json", "utf8")), "1082625");
const balls = e.incidents.map((i) => i.payload as { innings: number; superOver: boolean; runs: number; extras: number; extraType: string | null; wicket: boolean; target?: number })
  .filter((p) => p.innings === 2 && !p.superOver)
  .map((p) => ({ matchId: "1082625", year: 2017, innings: 2, runsBatter: p.runs, extras: p.extras, extraType: p.extraType, wicket: p.wicket, target: p.target ?? null }));
const chase = chaseSamples(balls);
const target = chase[0].target;
const stateAt = (b: number) => (chase.find((s) => s.state.b === b) as (typeof chase)[number]).state;
const base = (s: Parameters<typeof predictStyles>[1]) => predictStyles(outcomes, s, target);

describe("option-conditioned win probability on real data (options)", () => {
  it("the artifact is versioned by its hash, refits identically and uses only the training seasons", () => {
    const { hash, source, ...a } = file;
    expect(source).toMatch(/Cricsheet/);
    expect(createHash("sha256").update(JSON.stringify(a)).digest("hex")).toBe(hash);
    expect(buildOptions()).toEqual(a);
    expect(a.trainedOnYears).toEqual(outcomes.trainedOnYears);
    expect(a).toMatchObject({ shrinkK: 200, minN: 300, hasStyles: true });
  });

  it("intent and tempo: data-rich options with distinct win probabilities, shrunk toward the state's distribution", () => {
    const s = stateAt(36);
    const intent = momentDecision("next-over-intent", s, predictOutcome(outcomes, s, target), base, file);
    expect(intent?.options).toHaveLength(3);
    expect(intent?.options.every((o) => o.sufficient && o.n >= 300)).toBe(true);
    expect(intent?.options.every((o) => o.wp > 0 && o.wp < 1)).toBe(true);
    expect(intent?.options[0].wp).not.toBe(intent?.options[1].wp);
    expect(Object.values(intent?.labels ?? {}).sort()).toEqual(["attack", "ease off", "hold"]);
    const tempo = momentDecision("chase-tempo", s, predictOutcome(outcomes, s, target), base, file);
    expect(tempo?.options.length).toBeGreaterThanOrEqual(2);
    expect(tempo?.gapPts).toBeGreaterThanOrEqual(0);
    // shrinkage: an option's distribution lies between its raw counts and the prior
    const c = file.counts[(intent?.options[0].option) as string][situationKey(s)];
    const prior = predictOutcome(outcomes, s, target);
    const dist = shrinkToward(c, prior, file.shrinkK);
    const n = Object.values(c).reduce((x, y) => x + y, 0);
    expect(Math.abs(dist[6] - prior[6])).toBeLessThanOrEqual(Math.abs(c[6] / n - prior[6]) + 1e-12);
  });

  it("death-over pace vs spin: too few labelled pace balls, so the decision says insufficient data rather than guess", () => {
    const s = stateAt(12);
    const d = momentDecision("death-bowling", s, predictOutcome(outcomes, s, target), base, file);
    expect(d).not.toBeNull();
    expect(d?.insufficient).toBe(true);
    expect(d?.best).toBeNull();
    expect(d?.options.find((o) => o.option === "style:pace")?.sufficient).toBe(false);
    // not offered before the death overs; style labels are mapped, never guessed
    expect(momentOptions("death-bowling", stateAt(60))).toBeNull();
    expect([styleClass("left-arm orthodox spin"), styleClass("fast bowling"), styleClass("batsman")]).toEqual(["spin", "pace", null]);
  });

  it("the default coin-flip band is 2 points: no best option when the top two are closer than that", () => {
    for (const b of [36, 24, 18, 12, 6]) for (const type of ["next-over-intent", "chase-tempo"] as const) {
      const s = stateAt(b);
      const d = momentDecision(type, s, predictOutcome(outcomes, s, target), base, file);
      if (!d) continue;
      expect(d.coinFlip).toBe(d.gapPts < 2);
      if (d.coinFlip) expect(d.best).toBeNull();
    }
  });

  it("styles come from a source whose policy allows training, and names two register entries share are dropped", () => {
    expect(checkRight("wikidata", "train", { prototypeData: false }).ok).toBe(true);
    const dir = mkdtempSync(join(tmpdir(), "styles-"));
    const f = join(dir, "s.csv");
    writeFileSync(f, "cricsheet_id,name,cricinfo_id,wikidata,bowling_style\na1,Harmeet Singh,1,Q1,left-arm orthodox spin\na2,Harmeet Singh,2,Q2,right-arm medium\na3,JJ Bumrah,3,Q3,right-arm fast\n");
    expect([...loadStyles(f)]).toEqual([["JJ Bumrah", "pace"]]);
    expect(loadStyles(join(dir, "missing.csv")).size).toBe(0);
  });
});

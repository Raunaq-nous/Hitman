// Offline doubly robust check of scenario estimates (F-E-09; docs/design-docs/models-and-grading.md "Counterfactuals").
// Logged decisions: death overs (start of overs 17–20) of IPL chases whose bowler has a recorded style (pace/spin,
// Wikidata via the courier). Reward: the chasing side won. Scenario estimates: F-E-05's option WP for pace and spin.
// Propensity of pace: logistic on the required rate, clipped to [0.05, 0.95]. Never shown to users as fact.
//   tsx scripts/dr-check.ts → data/models/dr-check-v1.json
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { drEstimate, type LoggedDecision } from "@/engine/doublyRobust";
import { fitLogistic, logistic, seededRandom } from "@/engine/matchCalibration";
import { predictOutcome, predictStyles, type OutcomeArtifact } from "@/engine/outcomeModel";
import { momentDecision, type OptionArtifact } from "@/engine/options";
import { loadChaseSamples } from "./fit-outcomes";
import { loadStyles } from "./fit-options";

const BOOT = 1000;
const round = (x: number, d = 4): number => Math.round(x * 10 ** d) / 10 ** d;

export function buildDrCheck() {
  const outcomes = JSON.parse(readFileSync("data/models/outcomes-v1.json", "utf8")) as OutcomeArtifact & { hash: string };
  const options = JSON.parse(readFileSync("data/models/options-v1.json", "utf8")) as OptionArtifact & { hash: string };
  const styles = loadStyles();
  const logged: (LoggedDecision & { match: string; season: number; rate: number })[] = [];
  for (const s of loadChaseSamples()) {
    if (s.state.b > 24 || s.state.b % 6 !== 0 || !s.bowler) continue; // the first legal ball of a death over
    const style = styles.get(s.bowler);
    if (!style) continue;
    const d = momentDecision("death-bowling", s.state, predictOutcome(outcomes, s.state, s.target), (st) => predictStyles(outcomes, st, s.target), options);
    if (!d) continue;
    const wp = Object.fromEntries(d.options.map((o) => [o.option, o.wp]));
    logged.push({ action: style === "pace" ? 1 : 0, reward: s.chaseWon, propensity: 0.5, m1: wp["style:pace"], m0: wp["style:spin"], match: s.matchId, season: s.year, rate: (s.state.r * 6) / s.state.b });
  }
  const prop = fitLogistic(logged.map((r) => r.rate), logged.map((r) => r.action));
  for (const r of logged) r.propensity = Math.min(0.95, Math.max(0.05, logistic(prop, r.rate)));
  const summary = (rows: typeof logged) => ({
    dr: { pace: drEstimate(rows, 1), spin: drEstimate(rows, 0) },
    model: { pace: rows.reduce((a, r) => a + r.m1, 0) / rows.length, spin: rows.reduce((a, r) => a + r.m0, 0) / rows.length },
  });
  const point = summary(logged);
  // match-level bootstrap of the disagreement (DR − model) for each action
  const byMatch = new Map<string, typeof logged>();
  for (const r of logged) { const l = byMatch.get(r.match) ?? []; l.push(r); byMatch.set(r.match, l); }
  const groups = [...byMatch.values()];
  const rand = seededRandom(9);
  const diffs = { pace: [] as number[], spin: [] as number[] };
  for (let b = 0; b < BOOT; b++) {
    const pool = Array.from({ length: groups.length }, () => groups[Math.floor(rand() * groups.length)]).flat();
    if (!pool.some((r) => r.action === 1) || !pool.some((r) => r.action === 0)) continue;
    const s = summary(pool);
    diffs.pace.push(s.dr.pace - s.model.pace); diffs.spin.push(s.dr.spin - s.model.spin);
  }
  const ci = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return [round(s[Math.floor(0.025 * s.length)]), round(s[Math.floor(0.975 * s.length) - 1])]; };
  return {
    // the death-bowling decision is never graded (too few labelled pace balls: insufficient), so this is exploratory
    version: "v1", status: "exploratory", decisionType: "death-bowling (pace vs spin)", outcomesHash: outcomes.hash, optionsHash: options.hash,
    loggedDecisions: logged.length, matches: groups.length, pace: logged.filter((r) => r.action === 1).length, spin: logged.filter((r) => r.action === 0).length,
    propensityModel: { a: round(prop.a), b: round(prop.b), feature: "required run rate", clip: [0.05, 0.95] },
    estimates: {
      pace: { model: round(point.model.pace), dr: round(point.dr.pace), disagreementPts: round((point.dr.pace - point.model.pace) * 100, 2), ci95Pts: ci(diffs.pace).map((x) => round(x * 100, 2)) },
      spin: { model: round(point.model.spin), dr: round(point.dr.spin), disagreementPts: round((point.dr.spin - point.model.spin) * 100, 2), ci95Pts: ci(diffs.spin).map((x) => round(x * 100, 2)) },
    },
    note: "Offline check only; scenario estimates are labelled model estimates and never shown as what would have happened.",
  };
}

if (process.argv[1]?.endsWith("dr-check.ts")) {
  const a = buildDrCheck();
  const hash = createHash("sha256").update(JSON.stringify(a)).digest("hex");
  writeFileSync("data/models/dr-check-v1.json", JSON.stringify({ hash, ...a }, null, 1) + "\n");
  console.log(JSON.stringify({ logged: a.loggedDecisions, pace: a.pace, spin: a.spin, estimates: a.estimates }), `sha256 ${hash.slice(0, 12)}`);
}

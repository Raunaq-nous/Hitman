// Rolling-origin calibration and the match-level gate (D-027, docs/design-docs/models-and-grading.md).
// For a season S: the outcome model is fitted on seasons before S, the isotonic map on S-3..S-1 only, and S is
// evaluated untouched. Choices are tuned on 2024 only; 2025 and 2026 are evaluated separately. The production map
// (for the next season) is fitted the same way on the latest three seasons.
//   tsx scripts/fit-calibration-rolling.ts   → data/models/calibration-v2.json, data/models/outcomes-v2.json
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { applyIsotonic, fitIsotonic, type IsotonicMap } from "@/engine/calibration";
import { createChaseModel, type ChaseModel } from "@/engine/chaseWp";
import { fitLogistic, logistic, matchBrier, matchCalibrationTest, seededRandom, simulateChase, type MatchSample } from "@/engine/matchCalibration";
import { fitOutcomes, predictStyles, type OutcomeArtifact } from "@/engine/outcomeModel";
import { loadChaseSamples } from "./fit-outcomes";

type Ball = ReturnType<typeof loadChaseSamples>[number];
export interface Choices { outcomeHalfLife: number; targetConditioning: boolean; isoHalfLife: number | null }

const TUNE_SEASON = 2024;
const EVAL_SEASONS = [2025, 2026];
const GRID: Choices[] = [1, 2, 4].flatMap((outcomeHalfLife) => [true, false].flatMap((targetConditioning) => [1, 2, null].map((isoHalfLife) => ({ outcomeHalfLife, targetConditioning, isoHalfLife }))));
const GATE = { minMatches: 40, boot: 1000, level: 0.95, maxEce: 0.05 };
const SIM_RUNS = Number(process.env.SIM_RUNS ?? 200);
const SHIFT = 0.08;
const rrr = (b: Ball): number => Math.min(36, (b.state.r * 6) / b.state.b);
const round = (x: number, d = 6): number => Math.round(x * 10 ** d) / 10 ** d;

const all = loadChaseSamples();
const seasons = [...new Set(all.map((b) => b.year))].sort((a, b) => a - b);

function chaseModels(outcomes: OutcomeArtifact): (target: number) => ChaseModel {
  const cache = new Map<number, ChaseModel>();
  return (target) => {
    let m = cache.get(target);
    if (!m) { m = createChaseModel((s) => predictStyles(outcomes, s, target)); cache.set(target, m); }
    return m;
  };
}

/** Exact WP for every ball of the given seasons, scored target by target (one chase model in memory at a time). */
function exactWp(outcomes: OutcomeArtifact, balls: Ball[]): number[] {
  const byTarget = new Map<number, number[]>();
  balls.forEach((b, i) => { const l = byTarget.get(b.target) ?? []; l.push(i); byTarget.set(b.target, l); });
  const out = new Array<number>(balls.length);
  for (const [target, idx] of byTarget) {
    const m = createChaseModel((s) => predictStyles(outcomes, s, target));
    for (const i of idx) out[i] = m.wp(balls[i].state);
  }
  return out;
}

function outcomeModelFor(season: number, outcomeHalfLife: number, targetConditioning: boolean, version: string): OutcomeArtifact {
  const train = seasons.filter((y) => y < season);
  return fitOutcomes(all, train, seasons.filter((y) => y >= season), { halfLifeYears: outcomeHalfLife, bucketK: 200, parentK: 500, targetConditioning }, version);
}

/** Calibration window S-3..S-1: isotonic map (era-weighted when isoHalfLife is set) and the run-rate baseline. */
function fitWindow(season: number, balls: Ball[], exact: number[], isoHalfLife: number | null): { map: IsotonicMap; baseline: { a: number; b: number }; window: number[] } {
  const window = [season - 3, season - 2, season - 1];
  const inWin = balls.map((b, i) => ({ b, p: exact[i] })).filter(({ b }) => window.includes(b.year));
  const perMatch = new Map<string, number>();
  for (const { b } of inWin) perMatch.set(b.matchId, (perMatch.get(b.matchId) ?? 0) + 1);
  const era = (y: number): number => (isoHalfLife === null ? 1 : 0.5 ** ((season - 1 - y) / isoHalfLife));
  // every match counts once in both fits: a ball weighs 1 / (balls of its match)
  const map = fitIsotonic(inWin.map(({ b, p }) => ({ p, y: b.chaseWon, w: era(b.year) / (perMatch.get(b.matchId) as number) })));
  const baseline = fitLogistic(inWin.map(({ b }) => rrr(b)), inWin.map(({ b }) => b.chaseWon), inWin.map(({ b }) => 1 / (perMatch.get(b.matchId) as number)));
  return { map, baseline, window };
}

function evaluate(season: number, balls: Ball[], exact: number[], map: IsotonicMap, baseline: { a: number; b: number }) {
  const idx = balls.map((b, i) => i).filter((i) => balls[i].year === season);
  const recal: MatchSample[] = idx.map((i) => ({ p: applyIsotonic(map, exact[i]), y: balls[i].chaseWon, match: balls[i].matchId }));
  const raw: MatchSample[] = idx.map((i) => ({ p: exact[i], y: balls[i].chaseWon, match: balls[i].matchId }));
  const base: MatchSample[] = idx.map((i) => ({ p: logistic(baseline, rrr(balls[i])), y: balls[i].chaseWon, match: balls[i].matchId }));
  return { recal, raw, base, brier: { recalibrated: matchBrier(recal), exact: matchBrier(raw), runRateLogistic: matchBrier(base) } };
}

/** Fairness: simulate the season's chases under the origin's own model (calibrated by construction). */
function fairness(season: number, outcomes: OutcomeArtifact, seed: number) {
  const targets = [...new Map(all.filter((b) => b.year === season).map((b) => [b.matchId, b.target])).entries()];
  const model = chaseModels(outcomes);
  const rand = seededRandom(seed);
  let calibratedPass = 0, upFail = 0, downFail = 0;
  for (let run = 0; run < SIM_RUNS; run++) {
    const sim: MatchSample[] = [];
    for (const [match, target] of targets) {
      const m = model(target);
      const { states, won } = simulateChase(m, { b: 120, w: 10, r: target }, rand);
      for (const s of states) sim.push({ p: m.wp(s), y: won, match });
    }
    const opts = { ...GATE, seed: seed + run };
    if (matchCalibrationTest(sim, opts).pass) calibratedPass++;
    if (!matchCalibrationTest(sim.map((x) => ({ ...x, p: Math.min(1, x.p + SHIFT) })), opts).pass) upFail++;
    if (!matchCalibrationTest(sim.map((x) => ({ ...x, p: Math.max(0, x.p - SHIFT) })), opts).pass) downFail++;
  }
  return { runs: SIM_RUNS, matches: targets.length, calibratedPassRate: calibratedPass / SIM_RUNS, shiftedUpFailRate: upFail / SIM_RUNS, shiftedDownFailRate: downFail / SIM_RUNS, shiftPts: SHIFT * 100 };
}

function drift() {
  return seasons.map((y) => {
    const ys = all.filter((b) => b.year === y);
    const matches = [...new Map(ys.map((b) => [b.matchId, b])).values()];
    const runs = ys.reduce((a, b) => a + (typeof b.outcome === "number" ? b.outcome : 0), 0);
    return { season: y, matches: matches.length, chaseWinRate: round(matches.reduce((a, b) => a + b.chaseWon, 0) / matches.length, 4), meanTarget: round(matches.reduce((a, b) => a + b.target, 0) / matches.length, 1), chaseRunsPerLegalBall: round(runs / ys.length, 3) };
  });
}

function main(): void {
  // 1. tune on 2024 only (outcome model < 2024, map on 2021–2023, scored on 2024)
  const tuneBalls = all.filter((b) => b.year >= TUNE_SEASON - 3 && b.year <= TUNE_SEASON);
  const tuning: { choices: Choices; brier: number; ece: number }[] = [];
  for (const outcomeHalfLife of [1, 2, 4]) for (const targetConditioning of [true, false]) {
    const outcomes = outcomeModelFor(TUNE_SEASON, outcomeHalfLife, targetConditioning, "tune");
    const exact = exactWp(outcomes, tuneBalls);
    for (const c of GRID.filter((g) => g.outcomeHalfLife === outcomeHalfLife && g.targetConditioning === targetConditioning)) {
      const { map, baseline } = fitWindow(TUNE_SEASON, tuneBalls, exact, c.isoHalfLife);
      const e = evaluate(TUNE_SEASON, tuneBalls, exact, map, baseline);
      tuning.push({ choices: c, brier: round(e.brier.recalibrated), ece: round(matchCalibrationTest(e.recal, GATE).ece) });
      console.log(`tune 2024 ${JSON.stringify(c)} brier ${e.brier.recalibrated.toFixed(4)}`);
    }
  }
  const chosen = [...tuning].sort((a, b) => a.brier - b.brier || a.ece - b.ece)[0].choices;
  console.log("chosen", chosen);

  // 2. evaluate 2025 and 2026 separately with the chosen choices
  const evaluations = EVAL_SEASONS.map((season, k) => {
    const outcomes = outcomeModelFor(season, chosen.outcomeHalfLife, chosen.targetConditioning, `origin-${season}`);
    const balls = all.filter((b) => b.year >= season - 3 && b.year <= season);
    const exact = exactWp(outcomes, balls);
    const { map, baseline, window } = fitWindow(season, balls, exact, chosen.isoHalfLife);
    const e = evaluate(season, balls, exact, map, baseline);
    const test = matchCalibrationTest(e.recal, GATE);
    const matches = [...new Set(e.recal.map((x) => x.match))].map((id) => {
      const mine = e.recal.map((x, i) => ({ x, i })).filter(({ x }) => x.match === id);
      return { match: id, y: mine[0].x.y, recalibrated: mine.map(({ x }) => round(x.p)), exact: mine.map(({ i }) => round(e.raw[i].p)), runRateLogistic: mine.map(({ i }) => round(e.base[i].p)) };
    });
    const fair = fairness(season, outcomes, 1000 * (k + 1));
    const brierOk = e.brier.recalibrated < e.brier.exact && e.brier.recalibrated < e.brier.runRateLogistic;
    console.log(`season ${season}: calibration ${test.pass ? "PASS" : "FAIL"} (ece ${(test.ece * 100).toFixed(1)} pts, ${test.buckets.length} buckets), Brier recal ${e.brier.recalibrated.toFixed(4)} exact ${e.brier.exact.toFixed(4)} logistic ${e.brier.runRateLogistic.toFixed(4)}; fairness pass ${fair.calibratedPassRate} fail+8 ${fair.shiftedUpFailRate} fail-8 ${fair.shiftedDownFailRate}`);
    for (const b of test.buckets) console.log(`  ${b.lo.toFixed(1)}-${b.hi.toFixed(1)} matches ${b.matches} pred ${b.meanPredicted.toFixed(3)} obs ${b.observed.toFixed(3)} CI [${b.ciLo.toFixed(3)}, ${b.ciHi.toFixed(3)}] ${b.covered ? "ok" : "MISS"}`);
    return {
      season, outcomeTrainedOn: outcomes.trainedOnYears, calibrationFitOn: window, map,
      baseline: { a: round(baseline.a), b: round(baseline.b) },
      test, brier: { recalibrated: round(e.brier.recalibrated), exact: round(e.brier.exact), runRateLogistic: round(e.brier.runRateLogistic) },
      brierOk, fairness: fair, pass: test.pass && brierOk && fair.calibratedPassRate >= 0.9 && fair.shiftedUpFailRate >= 0.8 && fair.shiftedDownFailRate >= 0.8,
      matches,
    };
  });

  // 3. production: the next season's model and map, fitted the same way on everything up to the latest season
  const next = seasons[seasons.length - 1] + 1;
  const prodOutcomes = outcomeModelFor(next, chosen.outcomeHalfLife, chosen.targetConditioning, "v2");
  const prodBalls = all.filter((b) => b.year >= next - 3);
  const prod = fitWindow(next, prodBalls, exactWp(prodOutcomes, prodBalls), chosen.isoHalfLife);
  const outHash = createHash("sha256").update(JSON.stringify(prodOutcomes)).digest("hex");
  writeFileSync("data/models/outcomes-v2.json", JSON.stringify({ hash: outHash, source: "Cricsheet IPL ball-by-ball (cricsheet.org), data/derived/ipl-balls.csv.gz", ...prodOutcomes }) + "\n");

  const artifact = {
    version: "v2", method: "rolling-origin calibration with a match-level gate (D-027)", gate: { ...GATE, shiftPts: SHIFT * 100, minCalibratedPassRate: 0.9, minShiftedFailRate: 0.8 },
    tuning: { season: TUNE_SEASON, grid: tuning, chosen },
    evaluations, pass: evaluations.every((e) => e.pass),
    production: { forSeason: next, outcomesHash: outHash, calibrationFitOn: prod.window, map: prod.map },
    drift: drift(),
  };
  const hash = createHash("sha256").update(JSON.stringify(artifact)).digest("hex");
  writeFileSync("data/models/calibration-v2.json", JSON.stringify({ hash, ...artifact }) + "\n");
  console.log(`calibration-v2: gate ${artifact.pass ? "PASS" : "FAIL"}, sha256 ${hash.slice(0, 12)}`);
}

if (process.argv[1]?.endsWith("fit-calibration-rolling.ts")) main();

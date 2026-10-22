// Walk-forward recalibration and its gate (D-030, docs/design-docs/models-and-grading.md).
// Season S starts from an isotonic map fitted on S-3..S-1 (outcome model fitted on seasons before S) and is updated
// after every completed date of S by an online logit intercept; a match is scored only with earlier dates. The update
// rate is tuned on 2023–2024; 2025 and 2026 are gated pooled (match as the unit) and reported separately.
//   tsx scripts/fit-calibration-walkforward.ts   → data/models/calibration-v3.json
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { applyIsotonic, fitIsotonic } from "@/engine/calibration";
import { createChaseModel, type ChaseModel } from "@/engine/chaseWp";
import { calibrationLine, calibrationSlopeTest, fitLogistic, logistic, matchBrier, seededRandom, simulateChase, walkForward, type MatchSample, type WalkForwardMatch } from "@/engine/matchCalibration";
import { fitOutcomes, predictStyles, type OutcomeArtifact } from "@/engine/outcomeModel";
import { loadChaseSamples } from "./fit-outcomes";

type Ball = ReturnType<typeof loadChaseSamples>[number];
// outcome model and map choices tuned on 2024 for D-027 (data/models/calibration-v2.json → tuning.chosen)
const CHOICES = { outcomeHalfLife: 4, targetConditioning: true };
const TUNE_SEASONS = [2023, 2024];
const EVAL_SEASONS = [2025, 2026];
const ETAS = [0, 0.02, 0.05, 0.1, 0.2, 0.3, 0.5];
const BOOT = Number(process.env.BOOT ?? 1000);
const SIM_RUNS = Number(process.env.SIM_RUNS ?? 200);
const SIM_BOOT = Number(process.env.SIM_BOOT ?? 300);
const SHIFT_RUNS = Number(process.env.SHIFT_RUNS ?? 100);
const SHIFTS = [0.05, 0.08, 0.1, 0.12, 0.15, 0.2];
const MAX_BRIER_GAP = 0.002;
const round = (x: number, d = 6): number => Math.round(x * 10 ** d) / 10 ** d;
const rrr = (b: Ball): number => Math.min(36, (b.state.r * 6) / b.state.b);

const all = loadChaseSamples();
const seasons = [...new Set(all.map((b) => b.year))].sort((a, b) => a - b);

function outcomeModelFor(season: number): OutcomeArtifact {
  return fitOutcomes(all, seasons.filter((y) => y < season), seasons.filter((y) => y >= season), { halfLifeYears: CHOICES.outcomeHalfLife, bucketK: 200, parentK: 500, targetConditioning: CHOICES.targetConditioning }, `origin-${season}`);
}

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

interface SeasonData { season: number; outcomes: OutcomeArtifact; matches: (WalkForwardMatch & { exact: number[]; baseline: number[] })[] }

/** Pre-season map and baseline from S-3..S-1, and every S match's base (map-only), exact and baseline predictions. */
function seasonData(season: number): SeasonData {
  const outcomes = outcomeModelFor(season);
  const balls = all.filter((b) => b.year >= season - 3 && b.year <= season);
  const exact = exactWp(outcomes, balls);
  const win = balls.map((b, i) => ({ b, p: exact[i] })).filter(({ b }) => b.year < season);
  const per = new Map<string, number>();
  for (const { b } of win) per.set(b.matchId, (per.get(b.matchId) ?? 0) + 1);
  const map = fitIsotonic(win.map(({ b, p }) => ({ p, y: b.chaseWon, w: 1 / (per.get(b.matchId) as number) })));
  const baseline = fitLogistic(win.map(({ b }) => rrr(b)), win.map(({ b }) => b.chaseWon), win.map(({ b }) => 1 / (per.get(b.matchId) as number)));
  const byMatch = new Map<string, SeasonData["matches"][number]>();
  balls.forEach((b, i) => {
    if (b.year !== season) return;
    let m = byMatch.get(b.matchId);
    if (!m) { m = { match: b.matchId, date: b.date, y: b.chaseWon, preds: [], exact: [], baseline: [] }; byMatch.set(b.matchId, m); }
    m.preds.push(applyIsotonic(map, exact[i])); m.exact.push(exact[i]); m.baseline.push(logistic(baseline, rrr(b)));
  });
  return { season, outcomes, matches: [...byMatch.values()] };
}

const flat = (ms: { match: string; y: 0 | 1 }[], key: (m: never) => number[]): MatchSample[] => ms.flatMap((m) => key(m as never).map((p) => ({ p, y: m.y, match: m.match })));

function scoreSeason(d: SeasonData, eta: number) {
  const wf = walkForward(d.matches, eta);
  const exactOf = new Map(d.matches.map((m) => [m.match, m]));
  const matches = wf.matches.map((m, i) => ({ match: m.match, date: m.date, y: m.y, delta: round(wf.deltas[i]), walkForward: m.preds.map((p) => round(p)), exact: (exactOf.get(m.match) as SeasonData["matches"][number]).exact.map((p) => round(p)), baseline: (exactOf.get(m.match) as SeasonData["matches"][number]).baseline.map((p) => round(p)) }));
  return { matches, brier: { walkForward: matchBrier(flat(matches, (m: { walkForward: number[] }) => m.walkForward)), exact: matchBrier(flat(matches, (m: { exact: number[] }) => m.exact)), runRateLogistic: matchBrier(flat(matches, (m: { baseline: number[] }) => m.baseline)) } };
}

/** Simulated seasons on the same matches: chases played under each season's own model (calibrated by construction). */
function simulate(datas: SeasonData[], seed: number) {
  const models = datas.map((d) => {
    const cache = new Map<number, ChaseModel>();
    const targets = d.matches.map((m) => ({ match: m.match, target: all.find((b) => b.matchId === m.match)?.target as number }));
    return { targets, model: (t: number) => { let m = cache.get(t); if (!m) { m = createChaseModel((s) => predictStyles(d.outcomes, s, t)); cache.set(t, m); } return m; } };
  });
  const rand = seededRandom(seed);
  const season = (): MatchSample[] => models.flatMap(({ targets, model }) => targets.flatMap(({ match, target }) => {
    const m = model(target);
    const { states, won } = simulateChase(m, { b: 120, w: 10, r: target }, rand);
    return states.map((s) => ({ p: m.wp(s), y: won, match }));
  }));
  let pass = 0;
  for (let r = 0; r < SIM_RUNS; r++) if (!calibrationSlopeTest(season(), { boot: SIM_BOOT, seed: seed + r }).reject) pass++;
  const power: { shiftPts: number; upRejectRate: number; downRejectRate: number }[] = [];
  for (const d of SHIFTS) {
    let up = 0, down = 0;
    for (let r = 0; r < SHIFT_RUNS; r++) {
      const s = season();
      if (calibrationSlopeTest(s.map((x) => ({ ...x, p: Math.min(1, x.p + d) })), { boot: SIM_BOOT, seed: seed + 10_000 + r }).reject) up++;
      if (calibrationSlopeTest(s.map((x) => ({ ...x, p: Math.max(0, x.p - d) })), { boot: SIM_BOOT, seed: seed + 20_000 + r }).reject) down++;
    }
    power.push({ shiftPts: d * 100, upRejectRate: up / SHIFT_RUNS, downRejectRate: down / SHIFT_RUNS });
    console.log(`  shift ${d * 100} pts: up ${up / SHIFT_RUNS} down ${down / SHIFT_RUNS}`);
  }
  const detectable = power.find((p) => p.upRejectRate >= 0.8 && p.downRejectRate >= 0.8);
  return { runs: SIM_RUNS, boot: SIM_BOOT, shiftRuns: SHIFT_RUNS, calibratedPassRate: pass / SIM_RUNS, power, minDetectableShiftPts: detectable ? detectable.shiftPts : null };
}

function main(): void {
  const data = new Map<number, SeasonData>();
  for (const s of [...TUNE_SEASONS, ...EVAL_SEASONS]) { data.set(s, seasonData(s)); console.log(`season ${s}: ${data.get(s)?.matches.length} matches scored`); }

  // 1. tune the update rate on 2023–2024 pooled (match-weighted Brier)
  const tuning = ETAS.map((eta) => {
    const ms = TUNE_SEASONS.flatMap((s) => scoreSeason(data.get(s) as SeasonData, eta).matches);
    return { eta, brier: round(matchBrier(flat(ms, (m: { walkForward: number[] }) => m.walkForward))) };
  });
  const eta = [...tuning].sort((a, b) => a.brier - b.brier || a.eta - b.eta)[0].eta;
  console.log("tuning", JSON.stringify(tuning), "chosen eta", eta);

  // 2. evaluate 2025 and 2026 with the chosen rate; gate pooled, report per season
  const perSeason = EVAL_SEASONS.map((s) => {
    const r = scoreSeason(data.get(s) as SeasonData, eta);
    const t = calibrationSlopeTest(flat(r.matches, (m: { walkForward: number[] }) => m.walkForward), { boot: BOOT, seed: s });
    const chaseWinRate = r.matches.reduce((a, m) => a + m.y, 0) / r.matches.length;
    return { season: s, matches: r.matches.length, chaseWinRate: round(chaseWinRate, 4), brier: { walkForward: round(r.brier.walkForward), exact: round(r.brier.exact), runRateLogistic: round(r.brier.runRateLogistic) }, slopeTest: { a: round(t.a), b: round(t.b), wald: round(t.wald, 4), reject: t.reject }, finalDelta: r.matches[r.matches.length - 1].delta, rows: r.matches };
  });
  const pooled = perSeason.flatMap((p) => p.rows);
  const wfSamples = flat(pooled, (m: { walkForward: number[] }) => m.walkForward);
  const test = calibrationSlopeTest(wfSamples, { boot: BOOT, seed: 2025 });
  const line = calibrationLine(wfSamples);
  const brier = { walkForward: matchBrier(wfSamples), exact: matchBrier(flat(pooled, (m: { exact: number[] }) => m.exact)), runRateLogistic: matchBrier(flat(pooled, (m: { baseline: number[] }) => m.baseline)) };
  console.log(`pooled: a ${line.a.toFixed(3)} b ${line.b.toFixed(3)} wald ${test.wald.toFixed(2)} (crit ${test.critical.toFixed(2)}) reject ${test.reject}; Brier wf ${brier.walkForward.toFixed(4)} exact ${brier.exact.toFixed(4)} logistic ${brier.runRateLogistic.toFixed(4)}`);
  for (const p of perSeason) console.log(`season ${p.season}: chase win ${p.chaseWinRate}, Brier ${JSON.stringify(p.brier)}, slope test ${JSON.stringify(p.slopeTest)}, final δ ${p.finalDelta}`);

  // 3. fairness and power on the same matches
  const sim = simulate(EVAL_SEASONS.map((s) => data.get(s) as SeasonData), 7);
  console.log(`simulation: calibrated pass ${sim.calibratedPassRate}, min detectable shift ${sim.minDetectableShiftPts} pts`);

  const checks = {
    a_calibrationNotRejected: !test.reject,
    b_brierBeatsExact: brier.walkForward < brier.exact,
    b_brierWithinLogistic: brier.walkForward <= brier.runRateLogistic + MAX_BRIER_GAP,
    c_calibratedPassRate: sim.calibratedPassRate >= 0.9,
    d_minDetectableShift: sim.minDetectableShiftPts !== null && sim.minDetectableShiftPts <= 15,
  };
  const artifact = {
    version: "v3", method: "walk-forward recalibration (D-030): pre-season isotonic map on S-3..S-1, online logit-intercept update after each completed date",
    choices: CHOICES, tuning: { seasons: TUNE_SEASONS, grid: tuning, eta },
    gate: { pooledSeasons: EVAL_SEASONS, boot: BOOT, alpha: 0.05, maxBrierGapToLogistic: MAX_BRIER_GAP, minCalibratedPassRate: 0.9, maxDetectableShiftPts: 15 },
    pooled: { matches: new Set(pooled.map((m) => m.match)).size, a: round(line.a), b: round(line.b), wald: round(test.wald, 4), critical: round(test.critical, 4), reject: test.reject, brier: { walkForward: round(brier.walkForward), exact: round(brier.exact), runRateLogistic: round(brier.runRateLogistic) } },
    simulation: sim, checks, pass: Object.values(checks).every(Boolean),
    seasons: perSeason,
    production: { method: "before season S: outcome model on seasons < S, isotonic map on S-3..S-1, δ = 0; after each completed date: δ += η × Σ (result − adjusted pre-match probability)", eta },
  };
  const hash = createHash("sha256").update(JSON.stringify(artifact)).digest("hex");
  writeFileSync("data/models/calibration-v3.json", JSON.stringify({ hash, ...artifact }) + "\n");
  console.log(`calibration-v3: ${artifact.pass ? "PASS" : "FAIL"} ${JSON.stringify(checks)} sha256 ${hash.slice(0, 12)}`);
}

if (process.argv[1]?.endsWith("fit-calibration-walkforward.ts")) main();

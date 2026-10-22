// Fit the isotonic map exact-WP → observed win rate on training seasons; evaluate on the held-out seasons.
// Writes data/models/calibration-<version>.json (map + reliability buckets for the Notebook) with a content hash.
//   tsx scripts/fit-calibration.ts [version]
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { applyIsotonic, buckets, calibrationGate, fitIsotonic } from "@/engine/calibration";
import { createChaseModel } from "@/engine/chaseWp";
import { predictOutcome, type OutcomeArtifact } from "@/engine/outcomeModel";
import { loadChaseSamples } from "./fit-outcomes";

export function buildCalibration(version = "v1", outcomesVersion = "v1", halfLifeYears = Number(process.env.CAL_HALF_LIFE ?? 1)) {
  const outcomes = JSON.parse(readFileSync(`data/models/outcomes-${outcomesVersion}.json`, "utf8")) as OutcomeArtifact & { hash: string };
  const samples = loadChaseSamples();
  // one exact model per target (the outcome model depends on it); score target by target so only one model is in memory
  const probs = new Array<number>(samples.length);
  const byTarget = new Map<number, number[]>();
  samples.forEach((s, i) => { const l = byTarget.get(s.target) ?? []; l.push(i); byTarget.set(s.target, l); });
  for (const [target, idx] of byTarget) {
    const m = createChaseModel((st) => predictOutcome(outcomes, st, target));
    for (const i of idx) probs[i] = m.wp(samples[i].state);
  }
  const held = new Set(outcomes.heldOutYears);
  const latest = Math.max(...outcomes.trainedOnYears);
  // era weights: recent training seasons count more (same form as the outcome model)
  const scored = samples.map((s, i) => ({ p: probs[i], y: s.chaseWon, w: 0.5 ** ((latest - s.year) / halfLifeYears), held: held.has(s.year) }));
  const train = scored.filter((s) => !s.held), test = scored.filter((s) => s.held);
  const map = fitIsotonic(train);
  const raw = buckets(test);
  const calibrated = buckets(test.map((s) => ({ p: applyIsotonic(map, s.p), y: s.y })));
  const artifact = { version, halfLifeYears, outcomesHash: outcomes.hash, trainedOnYears: outcomes.trainedOnYears, heldOutYears: outcomes.heldOutYears, trainSamples: train.length, heldOutSamples: test.length, map, heldOutRawBuckets: raw, heldOutCalibratedBuckets: calibrated, gate: calibrationGate(calibrated) };
  return artifact;
}

if (process.argv[1]?.endsWith("fit-calibration.ts")) {
  const version = process.argv[2] ?? "v1";
  const a = buildCalibration(version, process.argv[3] ?? "v1");
  const hash = createHash("sha256").update(JSON.stringify(a)).digest("hex");
  writeFileSync(`data/models/calibration-${version}.json`, JSON.stringify({ hash, ...a }, null, 1) + "\n");
  console.log(`calibration-${version}: train ${a.trainSamples}, held-out ${a.heldOutSamples}; raw gate ${calibrationGate(a.heldOutRawBuckets).ok ? "pass" : "FAIL"}, calibrated gate ${a.gate.ok ? "pass" : "FAIL"} (${a.gate.checked} buckets checked)`);
  for (const b of a.heldOutCalibratedBuckets) console.log(`  ${b.lo.toFixed(1)}-${b.hi.toFixed(1)} n=${b.n} pred=${b.meanPredicted?.toFixed(3)} obs=${b.observed?.toFixed(3)} err=${b.errorPts?.toFixed(1)}`);
}

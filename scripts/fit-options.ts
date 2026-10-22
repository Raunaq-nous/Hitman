// Option counts for the Decision Lab's decision types (F-E-05), from the same training seasons as outcomes-v1.
// Bowling styles come from data/derived/bowling-styles.csv (Wikidata P2545 via the Cricsheet register); a bowler
// without a style statement contributes no pace/spin label (never guessed).
//   tsx scripts/fit-options.ts → data/models/options-v1.json
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fitOptionCounts, sampleOptions, situationKey, type OptionArtifact } from "@/engine/options";
import { loadChaseSamples, parseCsv } from "./fit-outcomes";

export const SHRINK_K = 200;
export const MIN_N = 300;

/** Wikidata bowling-style label → pace or spin; anything unrecognised stays unlabelled. */
export function styleClass(label: string): "pace" | "spin" | null {
  if (/spin|break|orthodox|googly|chinaman/i.test(label)) return "spin";
  if (/fast|seam|medium|swing/i.test(label)) return "pace";
  return null;
}

export function loadStyles(path = "data/derived/bowling-styles.csv"): Map<string, "pace" | "spin"> {
  if (!existsSync(path)) return new Map();
  const out = new Map<string, "pace" | "spin">();
  for (const r of parseCsv(readFileSync(path, "utf8"))) {
    const c = r.bowling_style ? styleClass(r.bowling_style) : null;
    if (c) out.set(r.name, c);
  }
  return out;
}

export function buildOptions(): OptionArtifact {
  const outcomes = JSON.parse(readFileSync("data/models/outcomes-v1.json", "utf8")) as { trainedOnYears: number[] };
  const train = new Set(outcomes.trainedOnYears);
  const styles = loadStyles();
  const labelled = loadChaseSamples().filter((s) => train.has(s.year)).flatMap((s) =>
    sampleOptions(s.state, s.bowler ? styles.get(s.bowler) ?? null : null).map((option) => ({ option, key: situationKey(s.state), outcome: s.outcome })));
  return { version: "v1", trainedOnYears: outcomes.trainedOnYears, shrinkK: SHRINK_K, minN: MIN_N, hasStyles: styles.size > 0, counts: fitOptionCounts(labelled) };
}

if (process.argv[1]?.endsWith("fit-options.ts")) {
  const a = buildOptions();
  const hash = createHash("sha256").update(JSON.stringify(a)).digest("hex");
  writeFileSync("data/models/options-v1.json", JSON.stringify({ hash, source: "Cricsheet IPL ball-by-ball; bowling styles: Wikidata (CC0)", ...a }) + "\n");
  console.log(`options-v1: ${Object.keys(a.counts).length} options, styles ${a.hasStyles}, sha256 ${hash.slice(0, 12)}`);
}

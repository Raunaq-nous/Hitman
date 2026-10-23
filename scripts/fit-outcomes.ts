// Fit the per-ball outcome model from data/derived/ipl-balls.csv.gz (built by the data courier from Cricsheet).
// Holds out the latest three seasons. Writes data/models/outcomes-<version>.json with a content hash.
//   tsx scripts/fit-outcomes.ts [version]
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { chaseSamples, fitOutcomes, type ChaseBall } from "@/engine/outcomeModel";

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; } else if (ch === '"') q = false; else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += ch;
  }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

export function loadChaseSamples(dir = "data/derived") {
  const matches = parseCsv(gunzipSync(readFileSync(`${dir}/ipl-matches.csv.gz`)).toString("utf8"));
  // rain-affected (revised target), tied and no-result matches don't feed the chase model
  const excluded = new Set(matches.filter((m) => m.method || m.result).map((m) => m.match_id));
  const balls = parseCsv(gunzipSync(readFileSync(`${dir}/ipl-balls.csv.gz`)).toString("utf8"));
  // chases over fewer than 20 overs (a shortened match without a recorded method) don't fit the 120-ball model
  for (const b of balls) if (b.innings === "2" && b.target_overs && Number(b.target_overs) < 20) excluded.add(b.match_id);
  const winner = new Map(matches.map((m) => [m.match_id, m.winner]));
  const dateOf = new Map(matches.map((m) => [m.match_id, m.date]));
  const chaser = new Map<string, string>();
  const byMatch = new Map<string, ChaseBall[]>();
  for (const b of balls) {
    if (excluded.has(b.match_id) || b.innings !== "2") continue;
    chaser.set(b.match_id, b.batting_team);
    const list = byMatch.get(b.match_id) ?? [];
    list.push({ matchId: b.match_id, year: Number(b.date.slice(0, 4)), innings: 2, runsBatter: Number(b.runs_batter), extras: Number(b.extras), extraType: b.extra_type || null, wicket: b.wicket === "1", target: b.target ? Number(b.target) : null, bowler: b.bowler });
    byMatch.set(b.match_id, list);
  }
  // each sample also carries whether the chasing side went on to win (for calibration)
  return [...byMatch.entries()].flatMap(([id, m]) => chaseSamples(m).map((s) => ({ ...s, date: dateOf.get(id) as string, chaseWon: (winner.get(id) === chaser.get(id) ? 1 : 0) as 0 | 1 })));
}

if (process.argv[1]?.endsWith("fit-outcomes.ts")) {
  const version = process.argv[2] ?? "v1";
  const samples = loadChaseSamples();
  const years = [...new Set(samples.map((s) => s.year))].sort();
  const heldOut = years.slice(-3), train = years.slice(0, -3);
  const halfLifeYears = Number(process.env.HALF_LIFE ?? 4);
  const artifact = fitOutcomes(samples, train, heldOut, { halfLifeYears, bucketK: Number(process.env.BUCKET_K ?? 200), parentK: Number(process.env.PARENT_K ?? 500) }, version);
  const body = JSON.stringify(artifact);
  const hash = createHash("sha256").update(body).digest("hex");
  mkdirSync("data/models", { recursive: true });
  writeFileSync(`data/models/outcomes-${version}.json`, JSON.stringify({ hash, source: "data/derived/ipl-balls.csv.gz (Cricsheet)", ...artifact }, null, 1) + "\n");
  console.log(`outcomes-${version}: ${artifact.samples} training balls from ${train[0]}–${train.at(-1)}, held out ${heldOut.join(", ")}, ${Object.keys(artifact.buckets).length} buckets, sha256 ${hash.slice(0, 12)}`);
}

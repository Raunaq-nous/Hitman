// Courier step: turn downloaded Cricsheet IPL JSON into compact, gzipped tables for model fitting.
// Uses the repo's Cricsheet adapter so the derived data follows the same parsing rules as ingest.
//   tsx scripts/courier/derive-cricsheet.ts <raw-dir> <out-dir>
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { parseCricsheet } from "@/adapters/cricket/cricsheet";

const [rawDir = "data/raw/cricsheet/ipl_json", outDir = "data/derived"] = process.argv.slice(2);
const csv = (v: unknown): string => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const ballCols = ["match_id", "season", "date", "innings", "batting_team", "over", "ball", "batter", "bowler", "runs_batter", "extras", "extra_type", "wicket", "wicket_kind", "target"];
const matchCols = ["match_id", "season", "date", "team1", "team2", "winner", "result", "method", "venue"];
const balls: string[] = [ballCols.join(",")];
const matches: string[] = [matchCols.join(",")];

for (const f of readdirSync(rawDir).filter((x) => /^\d+\.json$/.test(x)).sort()) {
  const id = f.replace(/\.json$/, "");
  const e = parseCricsheet(JSON.parse(readFileSync(join(rawDir, f), "utf8")), id);
  const o = e.outcome as { winner?: string; result?: string; method?: string };
  matches.push([id, e.season, e.startsAt.toISOString().slice(0, 10), e.participants[0].name, e.participants[1].name, o.winner, o.result, o.method, e.venue].map(csv).join(","));
  for (const i of e.incidents) {
    const p = i.payload as Record<string, unknown>;
    balls.push([id, e.season, e.startsAt.toISOString().slice(0, 10), p.innings, p.team, p.over, p.ball, p.batter, p.bowler, p.runs, p.extras, p.extraType, p.wicket ? 1 : 0, p.wicketKind, p.target].map(csv).join(","));
  }
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "ipl-balls.csv.gz"), gzipSync(balls.join("\n") + "\n", { level: 9 }));
writeFileSync(join(outDir, "ipl-matches.csv.gz"), gzipSync(matches.join("\n") + "\n", { level: 9 }));
console.log(`derived ${matches.length - 1} matches and ${balls.length - 1} deliveries into ${outDir}`);

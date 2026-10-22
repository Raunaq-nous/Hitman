// Recorded replays for the Desk: the committed fixture subset fetched by the data courier (data/manifest.json).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

const ROOT = join(process.cwd(), "data");
const json = (path: string): unknown => JSON.parse(readFileSync(join(ROOT, path), "utf8"));

export function cricketReplays(): { raw: unknown; ref: string }[] {
  return readdirSync(join(ROOT, "fixtures/cricsheet")).filter((f) => /^\d+\.json$/.test(f)).sort().map((f) => ({ raw: json(`fixtures/cricsheet/${f}`), ref: f.slice(0, -5) }));
}

export function footballReplays(): { matches: unknown; events: unknown; ref: string }[] {
  const dir = join(ROOT, "fixtures/statsbomb");
  const matches = json("fixtures/statsbomb/matches-43-3.json");
  return readdirSync(dir).filter((f) => /^events-\d+\.json\.gz$/.test(f)).sort().map((f) => ({ matches, events: JSON.parse(gunzipSync(readFileSync(join(dir, f))).toString("utf8")), ref: f.match(/\d+/)?.[0] as string }));
}

export function f1Replays(): { sessions: unknown; laps: unknown; ref: string }[] {
  const laps = json("fixtures/openf1/laps.json") as { session_key: number }[];
  return [...new Set(laps.map((l) => l.session_key))].map((k) => ({ sessions: json("fixtures/openf1/sessions-2023-race.json"), laps, ref: String(k) }));
}

export function outcomeModel(): { hash: string; version: string } & Record<string, unknown> {
  return json("models/outcomes-v1.json") as { hash: string; version: string } & Record<string, unknown>;
}
